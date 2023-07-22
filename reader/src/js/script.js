import {Catalog} from "./catalog.js";
import {toggleFullScreen} from "./utils.js";
import {setIcons} from "./icons";
import {updateCatalogDisplay} from "./catalog-ui";
import {modifySettingsValue, updateProperties, updateSettingsDisplay} from "./settings-ui";
import {initPanzoom, zoomDefault, zoomFitToScreen, zoomFitToWidth, zoomOriginal} from "./panzoom-utils";
import {closePopup, openPopup, togglePopup} from "./popup";
import {version} from '../../package.json';
import {
    firstPage,
    inputLeft,
    inputLeftLeft,
    inputRight,
    inputRightRight,
    lastPage,
    nextPage,
    prevPage,
    volumeLeft,
    volumeRight
} from "./controls";
import {updatePage} from "./page-utils";
import "./upload";
import {unselectBox} from "./select-box";
import {settings} from "./settings";
import {loadVolume} from "./load-volume";
import {globalState} from "./state";
import {importVolume} from "./web-import";
import {importUrlPrompt} from "./upload";

window.catalog = null;
window.loadedVolume = null;
window.numPages = -1;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(
        new URL('../service-worker.js', import.meta.url),
        {type: 'module', scope: '/'}
    );
}


document.addEventListener('DOMContentLoaded', async function () {
    console.log("mokuro reader " + version);
    setIcons();

    window.catalog = await Catalog.load();
    updateCatalogDisplay();

    initPanzoom();

    updateSettingsDisplay();
    updateProperties();

    if (globalState.lastOpened === null) {
        await loadDemo();
        openPopup("popupAbout");
    } else if (globalState.loadedVolumeId === null) {
        openPopup("popupCatalog");
    } else {
        await loadVolume(globalState.loadedVolumeId);
    }

    // openPopup("popupHotkeys");
    // openPopup("popupCatalog");
    // openPopup("popupAbout");
    // openPopup("popupSettings");

    globalState.lastOpened = Date.now();

}, false);

async function loadDemo() {
    await importVolume("demo/UchiNoNyan'sDiary.mokuro");
    await loadVolume("demo-volume");
}

document.getElementById('versionDisplay').textContent = version;

document.getElementById('menuOriginalSize').addEventListener('click', zoomOriginal, false);
document.getElementById('menuFitToWidth').addEventListener('click', zoomFitToWidth, false);
document.getElementById('menuFitToScreen').addEventListener('click', zoomFitToScreen, false);
document.getElementById('menuFullScreen').addEventListener('click', toggleFullScreen, false);

document.getElementById('menuAbout').addEventListener('click', function () {
    openPopup("popupAbout");
}, false);

document.getElementById('menuCatalog').addEventListener('click', function () {
    openPopup("popupCatalog");
}, false);

document.getElementById('menuCloseVolume').addEventListener('click', async function () {
    await loadVolume(null);
}, false);

document.getElementById('menuSettings').addEventListener('click', function () {
    openPopup("popupSettings");
}, false);

document.getElementById('chooseFilesButton').addEventListener('click', async function () {
    document.getElementById('uploadFile').click();
}, false);

document.getElementById('chooseDirectoryButton').addEventListener('click', async function () {
    document.getElementById('uploadDirectory').click();
}, false);

document.getElementById('importUrlButton').addEventListener('click', importUrlPrompt, false);

document.querySelectorAll(".popupCloseButton").forEach(function (x) {
    x.addEventListener("click", closePopup, false);
});

document.getElementById('dimOverlay').addEventListener('click', function () {
    closePopup();
}, false);


document.getElementById('pageIdxInput').addEventListener('change', (e) => {
    updatePage(e.target.value - 1);
})

document.getElementById('openCatalogButton').addEventListener('click', function () {
    openPopup("popupCatalog", false);
}, false);

document.getElementById('hotkeysButton').addEventListener('click', function () {
    openPopup("popupHotkeys", false);
}, false);

document.getElementById('loadDemoButton').addEventListener('click', function () {
    loadDemo();
}, false);

document.getElementById('buttonHideMenu').addEventListener('click', function () {
    document.getElementById('showMenuA').style.display = "inline-block";
    document.getElementById('topMenu').classList.add("hidden");
}, false);

document.getElementById('showMenuA').addEventListener('click', function () {
    document.getElementById('showMenuA').style.display = "none";
    document.getElementById('topMenu').classList.remove("hidden");
}, false);

document.getElementById('buttonLeftLeft').addEventListener('click', inputLeftLeft, false);
document.getElementById('buttonLeft').addEventListener('click', inputLeft, false);
document.getElementById('buttonRight').addEventListener('click', inputRight, false);
document.getElementById('buttonRightRight').addEventListener('click', inputRightRight, false);
document.getElementById('leftAPage').addEventListener('click', inputLeft, false);
document.getElementById('leftAScreen').addEventListener('click', inputLeft, false);
document.getElementById('rightAPage').addEventListener('click', inputRight, false);
document.getElementById('rightAScreen').addEventListener('click', inputRight, false);

document.addEventListener("keydown", async function onEvent(e) {
    let activeElement = document.activeElement;
    if (activeElement.contentEditable === "true") {
        return;
    }

    switch (e.key) {
        case "ArrowLeft":
            if (settings.turnPagesWithArrows) {
                await inputLeft();
            }
            break;

        case "ArrowRight":
            if (settings.turnPagesWithArrows) {
                await inputRight();
            }
            break;

        case "ArrowUp":
            if (settings.turnPagesWithArrows) {
                await prevPage();
            }
            break;

        case "ArrowDown":
            if (settings.turnPagesWithArrows) {
                await nextPage();
            }
            break;

        case "PageUp":
            await prevPage();
            break;

        case "PageDown":
            await nextPage();
            break;

        case "Home":
            firstPage();
            break;

        case "End":
            lastPage();
            break;

        case " ":
            await nextPage();
            break;

        case "0":
            zoomDefault();
            break;

        case ",":
            await volumeLeft();
            break;

        case ".":
            await volumeRight();
            break;

        case "c":
            togglePopup("popupCatalog");
            break;

        case "s":
            togglePopup("popupSettings");
            break;

        case "Escape":
            closePopup();
            break;

        case "f":
            toggleFullScreen();
            break;

        case "h":
            togglePopup("popupAbout");
            break;

        case "x":
            await loadVolume(null);
            break;

        case "d":
            if (window.loadedVolume !== null) {
                modifySettingsValue("volume", "doublePageView", !settings.doublePageView);
            }
            break;

        case "j":
            if (window.loadedVolume !== null) {
                modifySettingsValue("volume", "r2l", !settings.r2l);
            }
            break;

        case "p":
            if (window.loadedVolume !== null) {
                modifySettingsValue("volume", "hasCover", !settings.hasCover);
            }
            break;

        case "r":
            if (window.loadedVolume !== null) {
                settings.resetVolume();
                updateSettingsDisplay();
                updateProperties();
                updatePage();
            }
            break;

    }
});

document.addEventListener('click', function (e) {
    if (e.target.closest('.textBox') === null) {
        unselectBox();
    }
}, false);
