import {volumeState} from "./state";
import {settings} from "./settings";
import {setZoomMinMax, zoomDefault} from "./panzoom-utils";
import {setVolumePageState} from "./catalog-ui";

let pc = document.getElementById('pagesContainer');
let r = document.querySelector(':root');

function getPage(page_idx) {
    return document.getElementById("page" + page_idx);
}

function isPageFirstOfPair(page_idx) {
    if (!settings.doublePageView) {
        return true;
    } else {
        if (settings.hasCover) {
            return (page_idx === 0 || (page_idx % 2 === 1));
        } else {
            return page_idx % 2 === 0;
        }
    }
}

function eInkRefresh() {
    pc.classList.add("inverted");
    document.body.style.backgroundColor = "black";
    setTimeout(function () {
        pc.classList.remove("inverted");
        document.body.style.backgroundColor = r.style.getPropertyValue("--colorBackground");
    }, 300);
}

export function updatePage(new_page_idx) {
    if (window.loadedVolume === null) {
        return;
    }

    if (new_page_idx === undefined) {
        new_page_idx = volumeState.page_idx;
    }

    new_page_idx = Math.min(Math.max(new_page_idx, 0), window.numPages - 1);

    getPage(volumeState.page_idx).style.display = "none";

    if (volumeState.page2_idx >= 0) {
        getPage(volumeState.page2_idx).style.display = "none";
    }

    if (isPageFirstOfPair(new_page_idx)) {
        volumeState.page_idx = new_page_idx;
    } else {
        volumeState.page_idx = new_page_idx - 1;
    }

    getPage(volumeState.page_idx).style.display = "inline-block";
    getPage(volumeState.page_idx).style.order = 2;

    if (settings.doublePageView && volumeState.page_idx < window.numPages - 1 && !isPageFirstOfPair(volumeState.page_idx + 1)) {
        volumeState.page2_idx = volumeState.page_idx + 1;
        getPage(volumeState.page2_idx).style.display = "inline-block";

        if (settings.r2l) {
            getPage(volumeState.page2_idx).style.order = 1;
        } else {
            getPage(volumeState.page2_idx).style.order = 3;
        }

    } else {
        volumeState.page2_idx = -1;
    }

    document.getElementById("pageIdxInput").value = volumeState.page_idx + 1;

    let page2_txt = (volumeState.page2_idx >= 0) ? ',' + (volumeState.page2_idx + 1) : "";
    document.getElementById("pageIdxDisplay").innerHTML = (volumeState.page_idx + 1) + page2_txt + '/' + window.numPages;

    setVolumePageState(loadedVolume.id, Math.max(volumeState.page_idx, volumeState.page2_idx) + 1, window.numPages);
    setZoomMinMax();
    zoomDefault();
    if (settings.eInkMode) {
        eInkRefresh();
    }
}
