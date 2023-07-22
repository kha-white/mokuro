import {get, set, del, delMany, setMany} from 'idb-keyval';

import {sortByProperty} from "./utils.js";
import {volumeState} from "./state";


class Volume {
    static serializedFields = ["name", "mokuroData", "id", "imgStoredMap", "url"];

    constructor(parentCatalog, parentTitle, name, mokuroData, id = null, imgStoredMap = null, url = null) {
        this.id = id === null ? parentCatalog.getNewId() : id;
        this.parentCatalog = parentCatalog;
        this.parentTitle = parentTitle;
        this.name = name;
        this.mokuroData = mokuroData;
        this.URLs = {};
        this.imgStoredMap = imgStoredMap === null ? this.getImgStoredMap(mokuroData) : imgStoredMap;
        this.lastStoredPath = null;
        this.url = url; // if this is null, then the volume is stored locally

        parentCatalog.volumes[this.id] = this;
        parentTitle.volumes[this.id] = this;
    }

    async delete() {
        await delMany(this.mokuroData.pages.map(pageJSON => this.getImgKey(pageJSON.img_path)))

        delete this.parentCatalog.volumes[this.id];
        delete this.parentTitle.volumes[this.id];
        await this.parentCatalog.save();
        volumeState.delete(this.id);
    }

    toString() {
        return this.parentTitle.name + "/" + this.name;
    }

    serialize() {
        let x = {};
        for (let field of Volume.serializedFields) {
            x[field] = this[field];
        }
        return x;
    }

    static deserialize(x, parentCatalog, parentTitle) {
        return new Volume(
            parentCatalog,
            parentTitle,
            x.name,
            x.mokuroData,
            x.id,
            x.imgStoredMap,
            x.url
        );
    }

    getImgStoredMap(mokuroData) {
        let imgStoredMap = {};
        for (const page of mokuroData.pages) {
            imgStoredMap[page.img_path.replace("\\", "/")] = false;
        }
        return imgStoredMap;
    }

    getNumStoredImgs() {
        return Object.values(this.imgStoredMap).filter(Boolean).length;
    }

    isFullyStored() {
        if (this.url !== null) {
            return true;
        }
        return Object.values(this.imgStoredMap).every(Boolean);
    }


    getStatusString() {
        if (this.isFullyStored()) {
            return "";
        } else if (this.lastStoredPath === null) {
            return "Loading...";
        } else {
            return "Loading... (" + this.getNumStoredImgs() + "/" + this.mokuroData.pages.length + ") " + this.lastStoredPath;
        }
    }

    getImgKey(relativePath) {
        return "volume_" + this.id + "/" + relativePath.replace("\\", "/");
    }


    async addImg(imgFile, relativePath) {
        relativePath = relativePath.replace("\\", "/");
        if (relativePath in this.imgStoredMap) {
            await set(this.getImgKey(relativePath), imgFile);
            this.imgStoredMap[relativePath] = true;
            this.lastStoredPath = relativePath;
        } else {
            console.log("Skipping adding file: " + relativePath);
        }
    }

    async addImgs(imgFiles, relativePaths) {
        let keyvals = [];
        let relativePathsToStore = [];

        for (let i = 0; i < imgFiles.length; i++) {
            let imgFile = imgFiles[i];
            let relativePath = relativePaths[i];
            relativePath = relativePath.replace("\\", "/");

            if (relativePath in this.imgStoredMap) {
                keyvals.push([
                    this.getImgKey(relativePath),
                    imgFile
                ]);
                relativePathsToStore.push(relativePath);
            } else {
                console.log("Skipping adding file: " + relativePath);
            }
        }

        await setMany(keyvals);

        for (const relativePath of relativePathsToStore) {
            this.imgStoredMap[relativePath] = true;
            this.lastStoredPath = relativePath;
        }
    }

    async getImgURL(relativePath) {
        if (this.url !== null) {
            return this.url + "/" + relativePath;
        }

        let key = this.getImgKey(relativePath);

        if (key in this.URLs) {
            return this.URLs[key];
        } else {
            let imgFile = await get(key);

            if (imgFile === undefined) {
                console.error("Missing image for volume " + this.toString() + ": " + relativePath);
            }

            let imgURL = URL.createObjectURL(imgFile);
            this.URLs[key] = imgURL;
            return imgURL;
        }
    }

    clearURLs() {
        for (let url of Object.values(this.URLs)) {
            URL.revokeObjectURL(url);
        }
        this.URLs = {};
    }
}

class Title {
    static serializedFields = ["name", "id"];

    constructor(parentCatalog, name, id = null) {
        this.id = id === null ? parentCatalog.getNewId() : id;
        this.parentCatalog = parentCatalog;
        this.name = name;
        this.volumes = {};

        parentCatalog.titles[this.id] = this;
    }

    async delete() {
        await Promise.all(Object.values(this.volumes).map(async (volume) => {
            await volume.delete();
        }));

        delete this.parentCatalog.titles[this.id];
        await this.parentCatalog.save();
    }

    toString() {
        return this.name;
    }

    serialize() {
        let x = {};
        for (let field of Title.serializedFields) {
            x[field] = this[field];
        }

        x.volumes = [];
        for (let volume of Object.values(this.volumes)) {
            x.volumes.push(volume.serialize());
        }

        return x;
    }

    static deserialize(x, parentCatalog) {
        let title = new Title(
            parentCatalog,
            x.name,
            x.id
        );

        for (let v of x.volumes) {
            Volume.deserialize(v, parentCatalog, title);
        }

        return title;
    }

    async addVolumeIfNotExists(mokuroData, name, id = null, url = null) {
        if (id !== null && id in this.volumes) {
            return this.volumes[id];
        }
        return new Volume(this.parentCatalog, this, name, mokuroData, id, null, url);
    }

    getVolumes() {
        return sortByProperty(Object.values(this.volumes), "name", true, true);
    }
}


class Catalog {
    constructor() {
        this.titles = {};
        this.volumes = {};
        this.nextId = 0;
    }


    getNewId() {
        return this.nextId++;
    }

    async addTitleIfNotExists(name = null, id = null) {
        if (id !== null && id in this.titles) {
            return this.titles[id];
        }
        return new Title(this, name, id);
    }

    getTitles() {
        return sortByProperty(Object.values(this.titles), "name", true, true);
    }

    static async load() {
        let catalog = new Catalog();
        let c = await get("mokuroCatalog");

        if (c !== undefined) {
            catalog.nextId = c.nextId;
            for (let t of Object.values(c.titles)) {
                Title.deserialize(t, catalog);
            }
            console.log("Loaded catalog");
        }
        return catalog;
    }

    async save() {
        let c = {nextId: this.nextId, titles: []};
        for (let title of Object.values(this.titles)) {
            c.titles.push(title.serialize());
        }

        await set("mokuroCatalog", c)
            .then(() => console.log("Catalog saved"))
            .catch((err) => console.log('Error while saving catalog', err));
    }

}

export {Catalog}

