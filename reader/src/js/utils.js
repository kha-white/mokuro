import natsort from "natsort";

export function appendNewChild(parentElement, tagName, text = null) {
    let child = document.createElement(tagName);
    parentElement.appendChild(child);
    if (text !== null) {
        child.appendChild(document.createTextNode(text));
    }
    return child;
}

function normalize(inputString) {
    if (typeof inputString !== 'string') {
        return inputString;
    }

    let replacements = {
        '０': '0',
        '１': '1',
        '２': '2',
        '３': '3',
        '４': '4',
        '５': '5',
        '６': '6',
        '７': '7',
        '８': '8',
        '９': '9'
    };

    return inputString.replace(/[０１２３４５６７８９]/g, function (match) {
        return replacements[match];
    });
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
        return arr.sort((a, b) => sorter(normalize(a[property]), normalize(b[property])));
    }

    return arr.sort((a, b) => (normalize(a[property]) > normalize(b[property])) ? x : ((normalize(b[property]) > normalize(a[property])) ? -x : 0));
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

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persisted storage granted: ${isPersisted}`);
    }
}
