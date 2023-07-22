import {load, save} from "./utils.js";

class GlobalState {
    constructor() {
        this.key = "mokuro/State/global";
        this.state = null;
        this.fields = Object.keys(GlobalState.getDefault());
    }

    static getDefault() {
        return {
            loadedVolumeId: null,
            lastOpened: null,
        }
    }

    load() {
        this.state = load(this.key, GlobalState.getDefault);
    }

    save() {
        save(this.key, this.state);
    }

    reset() {
        this.state = null;
    }
}

class VolumeState {
    constructor() {
        this.key = null;
        this.state = null;
        this.fields = Object.keys(VolumeState.getDefault());
    }

    static getDefault() {
        return {
            page_idx: 0,
            page2_idx: -1,
            lastOpened: null,
        }
    }

    get(id) {
        return load("mokuro/State/volume/" + id, VolumeState.getDefault);
    }

    load(id) {
        this.key = "mokuro/State/volume/" + id;
        this.state = load(this.key, VolumeState.getDefault);
    }

    save() {
        save(this.key, this.state);
    }

    reset() {
        this.key = null;
        this.state = null;
    }

    delete(id) {
        localStorage.removeItem("mokuro/State/volume/" + id);
    }
}

const stateHandler = {
    get(target, prop, receiver) {
        if (target.fields.includes(prop)) {
            return target.state[prop];
        }

        return Reflect.get(...arguments);
    },

    set(target, prop, value) {
        if (target.fields.includes(prop)) {
            target.state[prop] = value;
            target.save();
            return true;
        }

        return Reflect.set(...arguments);
    }
}

const globalState = new Proxy(new GlobalState(), stateHandler);
globalState.load();

const volumeState = new Proxy(new VolumeState(), stateHandler);

export {globalState, volumeState};
