let statusBarTimeoutId = null;

export function setStatusBarText(text) {
    document.getElementById('statusBarText').textContent = text;
}

export function showStatusBar() {
    document.getElementById('statusBar').style.opacity = 1;
}

export function hideStatusBar() {
    document.getElementById('statusBar').style.opacity = 0;
}


export function showStatusBarForTime(timeout) {
    showStatusBar();
    if (statusBarTimeoutId !== null) {
        clearTimeout(statusBarTimeoutId);
    }
    statusBarTimeoutId = setTimeout(hideStatusBar, timeout);
}
