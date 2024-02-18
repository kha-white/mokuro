let popups = [];

export function openPopup(popupId, closeOthers = true) {
    if (closeOthers) {
        closeAllPopups();
    } else {
        popups = popups.filter(x => x !== popupId);
    }
    popups.push(popupId);
    showPopup(popupId);
}

export function closePopup() {
    popups.pop();
    if (popups.length == 0) {
        hideAllPopups();
    } else {
        showPopup(popups.at(-1));
    }
}

export function togglePopup(popupId) {
    if (popups[popups.length - 1] === popupId) {
        closePopup();
    } else {
        openPopup(popupId);
    }
}

export function closeAllPopups() {
    popups = [];
    hideAllPopups();
}

export function showPopup(popupId) {
    hideAllPopups();
    document.getElementById(popupId).style.display = 'block';
    document.getElementById('dimOverlay').style.display = 'initial';
    window.pz.pause();
}


export function hideAllPopups() {
    document.querySelectorAll(".popup").forEach(function (x) {
        x.style.display = "none";
    });

    document.getElementById('dimOverlay').style.display = 'none';
    window.pz.resume();
}
