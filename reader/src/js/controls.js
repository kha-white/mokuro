import {volumeState} from "./state";
import {settings} from "./settings";
import {loadVolume} from "./load-volume";
import {updatePage} from "./page-utils";

export function firstPage() {
    updatePage(0);
}

export function lastPage() {
    updatePage(window.numPages - 1);
}

export async function prevPage() {
    if (volumeState.page_idx === 0) {
        if (await prevVolume()) {
            lastPage();
        }
    } else {
        updatePage(volumeState.page_idx - (settings.doublePageView ? 2 : 1));
    }
}

export async function nextPage() {
    if (Math.max(volumeState.page_idx, volumeState.page2_idx) === window.numPages - 1) {
        if (await nextVolume()) {
            firstPage();
        }
    } else {
        updatePage(volumeState.page_idx + (settings.doublePageView ? 2 : 1));
    }
}

export function inputLeftLeft() {
    if (settings.r2l) {
        lastPage();
    } else {
        firstPage();
    }
}

export async function inputLeft() {
    if (settings.r2l) {
        await nextPage();
    } else {
        await prevPage();
    }
}

export async function inputRight() {
    if (settings.r2l) {
        await prevPage();
    } else {
        await nextPage();
    }
}

export function inputRightRight() {
    if (settings.r2l) {
        firstPage();
    } else {
        lastPage();
    }
}

export async function prevVolume() {
    if (window.loadedVolume !== null) {
        let volumes = window.loadedVolume.parentTitle.getVolumes();
        let i = volumes.indexOf(window.loadedVolume);
        if (i > 0) {
            await loadVolume(volumes[i - 1].id);
            return true;
        }
        return false;
    }

}

export async function nextVolume() {
    if (window.loadedVolume !== null) {
        let volumes = window.loadedVolume.parentTitle.getVolumes();
        let i = volumes.indexOf(window.loadedVolume);
        if (i < volumes.length - 1) {
            await loadVolume(volumes[i + 1].id);
            return true;
        }
        return false;
    }
}

export async function volumeLeft() {
    if (settings.r2l) {
        await nextVolume();
    } else {
        await prevVolume();
    }
}

export async function volumeRight() {
    if (settings.r2l) {
        await prevVolume();
    } else {
        await nextVolume();
    }
}
