import {setVolumeStatus, updateCatalogDisplay} from "./catalog-ui";
import {readJSON} from "./utils";
import {Unzipper} from "bitjs/archive/decompress.js";
import mime from "mime";
import * as path from 'path';
import {openPopup} from "./popup";
import {importFromUrl, importVolume} from "./web-import";

let dropbox = document.getElementById("dropbox");

["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"].forEach(function (type) {
    dropbox.addEventListener(type, function (e) {
        e.stopPropagation();
        e.preventDefault();
    }, false);
});

["dragover", "dragenter"].forEach(function (type) {
    dropbox.addEventListener(type, function (e) {
        dropbox.classList.add("isDragover");
    }, false);
});

["dragleave", "dragend", "drop"].forEach(function (type) {
    dropbox.addEventListener(type, function (e) {
        dropbox.classList.remove("isDragover");
    }, false);
});

dropbox.addEventListener("drop", async function (e) {
    const dt = e.dataTransfer;

    let text = e.dataTransfer.getData('text/plain');
    if (text) {
        await importFromUrl(text);
    }

    const fileHandlesPromises = [...dt.items]
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFileSystemHandle());

    let files = [];

    for await (const handle of fileHandlesPromises) {
        if (handle.kind === 'directory') {
            let path = [handle.name];
            let contents = [];

            await getFilesRecursively(handle, contents, path);

            contents.forEach((file) => {
                file.path_components = file?.path_components?.join('/');
            });

            files.push(...contents);
        } else {
            let file = await handle.getFile();
            file.path_components = file.name;
            files.push(file);
        }
    }

    await processFiles(files);

}, false);

export async function importUrlPrompt() {
    let text = prompt("Enter URL to import:");
    await importFromUrl(text);
}


async function getFilesRecursively(entry, files, path) {
    if (entry.kind === 'file') {
        const file = await entry.getFile();
        file.path_components = path;
        files.push(file);
    } else if (entry.kind === 'directory') {
        for await (const handle of entry.values()) {
            path.push(handle.name);
            let newPath = path.map((p) => p);
            await getFilesRecursively(handle, files, newPath);
            path.pop();
        }
    }
}

document.getElementById("uploadFile").addEventListener("change", async function () {
    await processFiles(this.files);
}, false);

document.getElementById("uploadDirectory").addEventListener("change", async function () {
    await processFiles(this.files);
}, false);

document.getElementById("uploadHelpButton").addEventListener("click", function () {
    openPopup('popupUploadHelp', false);
}, false);

function parsePath(file) {
    let filepath;

    if ("webkitRelativePath" in file && file.webkitRelativePath) {
        filepath = file.webkitRelativePath.replace('\\', '/');
    } else if ("path_components" in file) {
        filepath = file.path_components.replace('\\', '/');
    } else {
        filepath = file.name;
    }

    let parsed_path = path.parse(filepath);

    parsed_path.filepath = filepath;
    parsed_path.ext = parsed_path.ext.toLowerCase();
    parsed_path.path_no_ext = path.join(parsed_path.dir, parsed_path.name).replace('\\', '/');
    parsed_path.mime = mime.getType(filepath);

    return parsed_path;
}

async function processFiles(files) {
    let volumes_to_process = {}

    for (let file of files) {
        let parsed_path = parsePath(file);

        if (parsed_path.ext === '.mokuro') {
            let mokuroData = await readJSON(file);

            if (mokuroData.volume_uuid in catalog.volumes) {
                console.log('Skipping already loaded volume ' + parsed_path.filepath);
                continue;
            }

            volumes_to_process[parsed_path.path_no_ext] = {
                mokuroData: mokuroData,
                volumeName: parsed_path.name,
                archiveFile: null,
                files: {},
            };
        }
    }

    for (let file of files) {
        let parsed_path = parsePath(file);

        if (parsed_path.mime === "image/jpeg" || parsed_path.mime === "image/png") {
            for (const k of Object.keys(volumes_to_process)) {
                if (parsed_path.filepath.startsWith(k + "/")) {
                    volumes_to_process[k].files[path.relative(k, parsed_path.filepath)] = file;
                }
            }

        } else if (parsed_path.ext === '.zip' || parsed_path.ext === '.cbz') {
            if (parsed_path.path_no_ext in volumes_to_process) {
                volumes_to_process[parsed_path.path_no_ext].archiveFile = file;
            }
        }
    }

    let promises = [];
    for (const vtp of Object.values(volumes_to_process)) {
        promises.push(processVolume(vtp));
    }

    await Promise.all(promises)

    document.getElementById("uploadForm").reset();
    await window.catalog.save();
    updateCatalogDisplay();
}

async function processVolume(volume_to_process) {
    let mokuroData = volume_to_process.mokuroData;
    let volumeName = volume_to_process.volumeName;
    let archiveFile = volume_to_process.archiveFile;
    let files = volume_to_process.files;

    let title = await window.catalog.addTitleIfNotExists(mokuroData.title, mokuroData.title_uuid);
    let volume = await title.addVolumeIfNotExists(mokuroData, volumeName, mokuroData.volume_uuid);

    await window.catalog.save();
    updateCatalogDisplay();

    if (Object.keys(files).length >= mokuroData.pages.length) {
        console.log('Loading volume "' + volumeName + '" from files');
        await volume.addImgs(Object.values(files), Object.keys(files));

    } else {
        console.log('Loading volume "' + volumeName + '" from archive');
        await loadVolumeFromArchive(volume, volumeName, archiveFile);
    }

    await window.catalog.save();
    updateCatalogDisplay();
}

async function loadVolumeFromArchive(volume, volumeName, archiveFile) {
    let data = await archiveFile.arrayBuffer();
    const unzipper = new Unzipper(data);

    // unzipper.addEventListener('progress', function (e) {
    //     // e.currentFilename is the file currently being unarchived/scanned.
    //     // e.totalCompressedBytesRead has how many bytes have been unzipped so far
    // });

    unzipper.addEventListener('extract', async function (e) {
        // e.unarchivedFile.filename: string
        // e.unarchivedFile.fileData: Uint8Array

        let td;
        let relativePath;

        // try to decode filename in utf-8 and fallback to shift JIS if it fails
        try {
            td = new TextDecoder('utf-8', {fatal: true});
            relativePath = td.decode(e.unarchivedFile.filenameBytes);
        } catch (error) {
            td = new TextDecoder('sjis', {fatal: true});
            relativePath = td.decode(e.unarchivedFile.filenameBytes);
        }

        // console.log(relativePath);

        let mime_ = mime.getType(relativePath);

        if (mime_ === "image/jpeg" || mime_ === "image/png") {
            if (relativePath.startsWith(volumeName + "/")) {
                relativePath = relativePath.slice(volumeName.length + 1);
            }

            let file = new File([e.unarchivedFile.fileData], relativePath, {type: mime_});
            await volume.addImg(file, relativePath);
            setVolumeStatus(volume.id, volume.getStatusString());

            if (volume.isFullyStored()) {
                await window.catalog.save();
                updateCatalogDisplay();
            }
        }
    });

    // unzipper.addEventListener('finish', async function (e) {
    //     await window.catalog.save();
    //     updateCatalogDisplay();
    // });

    unzipper.start();
}