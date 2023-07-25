import {appendNewChild, formatBytes} from "./utils";
import {volumeState} from "./state";
import {loadVolume} from "./load-volume";
import {Catalog} from "./catalog";
import {clear} from "idb-keyval";

async function deleteVolume(id) {
    let volume = window.catalog.volumes[id];
    let msg = "Delete \"" + volume.toString() + "\"?\n\nThis will delete all data and reading progress associated with this volume from the browser storage.";
    if (confirm(msg)) {
        if (window.loadedVolume === volume) {
            await loadVolume(null);
        }
        await volume.delete();
        updateCatalogDisplay();
    }
}

async function deleteTitle(id) {
    let title = window.catalog.titles[id];
    let msg = "Delete \"" + title.name + "\" containing " + Object.keys(title.volumes).length + " volumes?\n\nThis will delete all data and reading progress associated with this title from the browser storage.";
    if (confirm(msg)) {
        if (window.loadedVolume !== null && window.loadedVolume.parentTitle === title) {
            await loadVolume(null);
        }
        await title.delete();
        updateCatalogDisplay();
    }
}

export function updateCatalogDisplay() {
    let catalogDisplay = document.getElementById("catalogDisplay");
    catalogDisplay.replaceChildren();
    let titleList = appendNewChild(catalogDisplay, "ul");
    let a;

    for (const title of window.catalog.getTitles()) {
        if (title.id === "demo-title") {
            continue;
        }
        let titleListEl = appendNewChild(titleList, "li");
        let titleItem = appendNewChild(titleListEl, "span", title.name);
        titleItem.classList.add("catalogItem");

        a = appendNewChild(titleItem, "a");
        a.classList.add("deleteCatalogItemButton");
        a.href = "#";
        a.addEventListener('click', async function () {
            await deleteTitle(title.id);
        }, false);
        a.appendChild(document.createTextNode("x"));

        let volumeList = appendNewChild(titleListEl, "ul");

        for (const volume of title.getVolumes()) {
            let volumeListEl = appendNewChild(volumeList, "li");
            let volumeItem = appendNewChild(volumeListEl, 'span');
            volumeItem.classList.add("catalogItem");

            if (volume.isFullyStored()) {
                a = appendNewChild(volumeItem, "a");
                a.href = "#";

                a.addEventListener('click', async function () {
                    await loadVolume(volume.id);
                }, false);
            } else {
                a = appendNewChild(volumeItem, "span");
            }

            a.appendChild(document.createTextNode(volume.name));

            let state = volumeState.get(volume.id);
            let page_idx = Math.max(state.page_idx, state.page2_idx) + 1;
            let num_pages = volume.mokuroData.pages.length;

            let volumeStats = appendNewChild(volumeItem, 'span', "(" + page_idx + "/" + num_pages + ")");
            volumeStats.id = "volumeStats" + volume.id;
            volumeStats.classList.add("volumeStats");

            let volumeStatus = appendNewChild(volumeItem, 'span', volume.getStatusString());
            volumeStatus.id = "volumeStatus" + volume.id;
            volumeStatus.classList.add("volumeStatus");

            if (volume.url !== null) {
                let volumeUrl = appendNewChild(volumeItem, "a", "↪");
                volumeUrl.classList.add("volumeUrl");
                volumeUrl.href = volume.url;
            }

            a = appendNewChild(volumeItem, "a");
            a.classList.add("deleteCatalogItemButton");
            a.href = "#";
            a.addEventListener('click', async function () {
                deleteVolume(volume.id);
            }, false);
            a.appendChild(document.createTextNode("x"));

        }
    }

    let catalogStatus = document.getElementById("catalogStatus");

    if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(({usage, quota}) => {
            catalogStatus.textContent = formatBytes(usage) + " / " + formatBytes(quota);
            if (usage > quota * 0.9 || quota - usage < 1024 * 1024 * 100) {
                catalogStatus.classList.add("colorRed");
            } else {
                catalogStatus.classList.remove("colorRed");
            }

        });
    }

}

export function setVolumePageState(volume_id, page_idx, num_pages) {
    let volumeStats = document.getElementById("volumeStats" + volume_id);
    if (volumeStats !== null) {
        volumeStats.textContent = "(" + page_idx + "/" + num_pages + ")";
    }
}

export function setVolumeStatus(volume_id, text) {
    let volumeStatus = document.getElementById("volumeStatus" + volume_id);
    if (volumeStatus !== null) {
        volumeStatus.textContent = text;
    }
}

document.getElementById("resetCatalogButton").addEventListener("click", async function () {
    let msg = "Reset catalog?\n\nThis will delete all data and reading progress from the browser storage.";
    if (confirm(msg)) {
        await loadVolume(null);
        await clear();
        window.catalog = await Catalog.load();
        updateCatalogDisplay();
    }
}, false);