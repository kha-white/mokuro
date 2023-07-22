import natsort from "natsort";

export function appendNewChild(parentElement, tagName, text = null) {
    let child = document.createElement(tagName);
    parentElement.appendChild(child);
    if (text !== null) {
        child.appendChild(document.createTextNode(text));
    }
    return child;
}

export function sortByProperty(arr, property, ascending = true, natural = false) {
    let x;
    if (ascending) {
        x = 1;
    } else {
        x = -1;
    }

    if (natural) {
        let sorter = natsort();
        return arr.sort((a, b) => sorter(a[property], b[property]));
    }

    return arr.sort((a, b) => (a[property] > b[property]) ? x : ((b[property] > a[property]) ? -x : 0));
}

export function clip(x, min, max) {
    return Math.min(Math.max(x, min), max);
}


export function toggleFullScreen() {
    let doc = window.document;
    let docEl = doc.documentElement;

    let requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    let cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        requestFullScreen.call(docEl);
    } else {
        cancelFullScreen.call(doc);
    }
}

export function load(key, getDefaultFn) {
    let state = getDefaultFn();
    let stateLoaded = localStorage.getItem(key)

    if (stateLoaded !== null) {
        stateLoaded = JSON.parse(stateLoaded);
        for (const k of Object.keys(state)) {
            if (k in stateLoaded) {
                state[k] = stateLoaded[k];
            }
        }
    }

    return state;
}

export function save(key, state) {
    localStorage.setItem(key, JSON.stringify(state));
}

export async function readJSON(file) {
    let text = await file.text();
    return JSON.parse(text);
}

export async function verifyPermission(fileHandle, withWrite) {
    const opts = {};
    if (withWrite) {
        opts.mode = 'readwrite';
    }

    // Check if we already have permission, if so, return true.
    if (await fileHandle.queryPermission(opts) === 'granted') {
        return true;
    }

    // Request permission to the file, if the user grants permission, return true.
    if (await fileHandle.requestPermission(opts) === 'granted') {
        return true;
    }

    // The user did not grant permission, return false.
    return false;
}