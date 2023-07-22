let selectedBox = null;

export function selectBox(textBox) {
    if (textBox !== selectedBox) {
        unselectBox();
        textBox.classList.add('selected');
        selectedBox = textBox;
    }
}

export function unselectBox() {
    if (selectedBox !== null) {
        selectedBox.classList.remove('selected');
    }

    selectedBox = null;
}
