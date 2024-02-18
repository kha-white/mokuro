import {setVolumeStatus, updateCatalogDisplay} from "./catalog-ui";
import {readJSON, requestPersistentStorage} from "./utils";
import {Unzipper} from "bitjs/archive/decompress.js";
import mime from "mime";
import * as path from 'path';
import {openPopup} from "./popup";
import {importFromUrl, importVolume} from "./web-import";

let dropArea = document.getElementById("popupCatalog");

["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"].forEach(function (type) {
    dropArea.addEventListener(type, function (e) {
        e.stopPropagation();
        e.preventDefault();
    }, false);
});

["dragover", "dragenter"].forEach(function (type) {
    dropArea.addEventListener(type, function (e) {
        dropArea.classList.add("isDragover");
    }, false);
});

["dragleave", "dragend", "drop"].forEach(function (type) {
    dropArea.addEventListener(type, function (e) {
        dropArea.classList.remove("isDragover");
    }, false);
});

dropArea.addEventListener("drop", async function (e) {
    const dt = e.dataTransfer;

    let text = e.dataTransfer.getData('text/plain');
    if (text) {
        await importFromUrl(text);
    }

    let filePromises = [];

    for (const item of dt.items) {
        if (item.kind === 'file') {
            let entry = item.webkitGetAsEntry();
            if (entry.isDirectory) {
                filePromises.push(scanFiles(entry));
            } else {
                filePromises.push(item.getAsFile());
            }
        }
    }

    let files = await Promise.all(filePromises).then(fileArrays => {
        return [].concat(...fileArrays);
    });

    await processFiles(files);

}, false);


function readAllEntries(directoryReader) {
    return new Promise((resolve, reject) => {
        let entries = [];

        function readEntries() {
            directoryReader.readEntries((batch) => {
                if (batch.length) {
                    entries = entries.concat(batch);
                    readEntries();
                } else {
                    resolve(entries);
                }
            }, reject);
        }

        readEntries();
    });
}

function scanFiles(directoryEntry, path = directoryEntry.name) {
    return new Promise((resolve, reject) => {
        let reader = directoryEntry.createReader();
        readAllEntries(reader).then((entries) => {
            let filePromises = entries.map(entry => {
                let fullPath = path + '/' + entry.name;
                if (entry.isDirectory) {
                    return scanFiles(entry, fullPath);
                } else {
                    return new Promise((resolve, reject) => {
                        entry.file(file => {
                            file.fullPath = fullPath;
                            resolve(file);
                        }, reject);
                    });
                }
            });

            Promise.all(filePromises).then(fileArrays => {
                let files = [].concat(...fileArrays);
                resolve(files);
            }).catch(reject);
        }).catch(reject);
    });
}

export async function importUrlPrompt() {
    let text = prompt("Enter URL to import:");
    await importFromUrl(text);
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

    if ("fullPath" in file) {
        filepath = file.fullPath;
    } else if ("webkitRelativePath" in file && file.webkitRelativePath) {
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

    if (Object.keys(volumes_to_process).length > 0) {
        await requestPersistentStorage();
    }

    let promises = [];
    for (const vtp of Object.values(volumes_to_process)) {
        promises.push(processVolume(vtp));
    }

    let results = await Promise.all(promises);
    let failed = results.filter(r => !r.loaded);
    if (failed.length) {
        let msg = "Failed to load volumes:\n";
        for (const f of failed) {
            msg += f.volumeName;
            if (f.loadingFrom === 'missing') {
                msg += ': missing volume data';
            }
            msg += '\n';
        }

        msg += '\nMake sure that each .mokuro file is uploaded together with corresponding volume data (images folder or cbz/zip archive).';
        msg += '\n\nClick "What to upload?" for more information.';
        alert(msg);
    }

    document.getElementById("uploadForm").reset();
    await window.catalog.save();
    updateCatalogDisplay();
}

async function processVolume(volume_to_process) {
    let mokuroData = volume_to_process.mokuroData;
    let volumeName = volume_to_process.volumeName;
    let archiveFile = volume_to_process.archiveFile;
    let files = volume_to_process.files;

    let volumeLoadingStatus = {
        volumeName: volumeName,
        loadingFrom: null,
        loaded: false,
    };

    if (Object.keys(files).length >= mokuroData.pages.length) {
        console.log('Loading volume "' + volumeName + '" from files');
        volumeLoadingStatus.loadingFrom = 'files';

    } else if (archiveFile) {
        console.log('Loading volume "' + volumeName + '" from archive');
        volumeLoadingStatus.loadingFrom = 'archive';

    } else {
        console.log('Skipping volume "' + volumeName + '" due to missing files');
        volumeLoadingStatus.loadingFrom = 'missing';
        return volumeLoadingStatus;
    }

    let title = await window.catalog.addTitleIfNotExists(mokuroData.title, mokuroData.title_uuid);
    let volume = await title.addVolumeIfNotExists(mokuroData, volumeName, mokuroData.volume_uuid);

    await window.catalog.save();
    updateCatalogDisplay();

    if (volumeLoadingStatus.loadingFrom === 'archive') {
        await loadVolumeFromArchive(volume, volumeName, archiveFile);
    } else if (volumeLoadingStatus.loadingFrom === 'files') {
        await volume.addImgs(Object.values(files), Object.keys(files));
    } else {
        throw new Error('Unknown loadingFrom: ' + volumeLoadingStatus.loadingFrom);
    }

    volumeLoadingStatus.loaded = true;

    await window.catalog.save();
    updateCatalogDisplay();

    return volumeLoadingStatus;
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