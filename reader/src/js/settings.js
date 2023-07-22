import {load, save} from "./utils.js";


class Option {
    constructor(id, label, description, defaultValue, inputType, isGlobal, selectOptions = null) {
        this.id = id;
        this.label = label;
        this.description = description;
        this.defaultValue = defaultValue;
        this.inputType = inputType;
        this.isGlobal = isGlobal;
        this.selectOptions = selectOptions;
    }
}

const options = [
    new Option(
        "defaultZoomMode",
        "on page turn",
        "",
        "fit to screen",
        "select",
        true,
        [
            "fit to screen",
            "fit to width",
            "original size",
            "keep zoom level"
        ]
    ),

    new Option(
        "r2l",
        "Japanese reading (right to left)",
        "",
        true,
        "toggle",
        false,
    ),

    new Option(
        "doublePageView",
        "display two pages",
        "",
        true,
        "toggle",
        false,
    ),

    new Option(
        "hasCover",
        "first page is cover",
        "",
        false,
        "toggle",
        false,
    ),

    new Option(
        "turnPagesWithArrows",
        "turn pages with arrow keys",
        "",
        false,
        "toggle",
        true,
    ),

    new Option(
        "ctrlToPan",
        "ctrl+mouse to move",
        "",
        false,
        "toggle",
        true,
    ),

    new Option(
        "altToZoom",
        "alt+scroll to zoom",
        "",
        false,
        "toggle",
        true,
    ),

    new Option(
        "displayOCR",
        "OCR enabled",
        "",
        true,
        "toggle",
        true,
    ),

    new Option(
        "textBoxBorders",
        "display boxes outlines",
        "",
        false,
        "toggle",
        true,
    ),

    new Option(
        "editableText",
        "editable text",
        "",
        false,
        "toggle",
        true,
    ),

    new Option(
        'toggleOCRTextBoxes',
        'toggle OCR text boxes on click',
        "",
        false,
        "toggle",
        true,
    ),


    new Option(
        "fontSize",
        "font size:",
        "",
        "auto",
        "select",
        false,
        [
            "auto",
            "9",
            "10",
            "11",
            "12",
            "14",
            "16",
            "18",
            "20",
            "24",
            "32",
            "40",
            "48",
            "60",
        ]
    ),

    new Option(
        "backgroundColor",
        "background color",
        "",
        "#C4C3D0",
        "color",
        true,
    ),

    new Option(
        "eInkMode",
        "e-ink mode",
        "",
        false,
        "toggle",
        true,
    ),
]

class Settings {
    constructor() {
        this.loadGlobal();
        this.volume = null;
        this.fields = Object.keys(Settings.getDefault());
    }

    static getDefault() {
        let x = {};
        for (let option of options) {
            x[option.id] = option.defaultValue;
        }
        return x;
    }

    static getDefaultVolume() {
        let x = {};
        for (let option of options) {
            x[option.id] = null;
        }
        return x;
    }


    loadGlobal() {
        let key = "mokuro/Settings/global";

        const handler = {
            set(target, prop, value) {
                target[prop] = value;
                save(key, target);
                return true;
            }
        }

        this.global = new Proxy(load(key, Settings.getDefault), handler);
    }

    loadVolume(id) {
        let key = "mokuro/Settings/volume/" + id;

        const handler = {
            set(target, prop, value) {
                target[prop] = value;
                save(key, target);
                return true;
            }
        }

        this.volume = new Proxy(load(key, Settings.getDefaultVolume), handler);
    }

    unloadVolume() {
        this.volume = null;
    }

    resetGlobal() {
        let state = Settings.getDefault();
        for (const k of Object.keys(state)) {
            this.global[k] = state[k];
        }
    }

    resetVolume() {
        let state = Settings.getDefaultVolume();
        for (const k of Object.keys(state)) {
            this.volume[k] = state[k];
        }
    }
}

const settingsHandler = {
    get(target, prop, receiver) {
        if (target.fields.includes(prop)) {

            if (target.volume === null || target.volume[prop] === null) {
                return target.global[prop];
            }

            return target.volume[prop];
        }

        return Reflect.get(...arguments);
    },

    set(target, prop, value) {
        if (target.fields.includes(prop)) {
            throw new Error("Cannot set value directly in settings. Use settings.global or settings.volume instead.");
        }

        return Reflect.set(...arguments);
    }
}

const settings = new Proxy(new Settings(), settingsHandler);

export {options, settings};
