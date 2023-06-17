let pz;

const preload = document.getElementById('preload-image');

let num_pages = -1;
let pc = document.getElementById('pagesContainer');
let r = document.querySelector(':root');
let showAboutOnStart = false;

let storageKey = 'mokuro_' + window.location.pathname;

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadState() {
  let newState = localStorage.getItem(storageKey);

  if (newState !== null) {
    state = JSON.parse(newState);
  }

  updateUI();
  updateProperties();
}

function preloadImage() {
  const page = getPage(state.page_idx + 1);
  const pageContainer = page?.querySelector('.pageContainer');
  const backgroundImageUrl = pageContainer?.style?.backgroundImage
    ?.slice(4, -1)
    .replace(/['"]/g, '');

  if (backgroundImageUrl) {
    preload.style.content = `url(${backgroundImageUrl})`;
  }
}

const sentenceField = document.getElementById('sentence-field-input');
const pictureField = document.getElementById('picture-field-input');
const settingsDialog = document.getElementById('settings-dialog');

sentenceField.addEventListener('change', () => {
  state.sentenceField = sentenceField.value;
});
pictureField.addEventListener('change', () => {
  state.pictureField = pictureField.value;
});

function initTextBoxes() {
  // Add event listeners for toggling ocr text boxes with the toggleOCRTextBoxes option.
  let textBoxes = document.querySelectorAll('.textBox');
  for (let i = 0; i < textBoxes.length; i++) {
    textBoxes[i].addEventListener('click', function (e) {
      if (state.toggleOCRTextBoxes) {
        this.classList.add('hovered');
        // Remove hovered state from all other .textBoxes
        for (let j = 0; j < textBoxes.length; j++) {
          if (i !== j) {
            textBoxes[j].classList.remove('hovered');
          }
        }
      }
    });
  }
  // When clicking off of a .textBox, remove the hovered state.
  document.addEventListener('click', function (e) {
    if (state.toggleOCRTextBoxes) {
      if (e.target.closest('.textBox') === null) {
        let textBoxes = document.querySelectorAll('.textBox');
        for (let i = 0; i < textBoxes.length; i++) {
          textBoxes[i].classList.remove('hovered');
        }
      }
    }
  });
}

document.getElementById('menuR2l').addEventListener(
  'click',
  function () {
    state.r2l = document.getElementById('menuR2l').checked;
    saveState();
    updatePage(state.page_idx);
  },
  false
);

document.getElementById('menuHasCover').addEventListener(
  'click',
  function () {
    state.hasCover = document.getElementById('menuHasCover').checked;
    saveState();
    updatePage(state.page_idx);
  },
  false
);

document.getElementById('menuTextBoxBorders').addEventListener(
  'click',
  function () {
    state.textBoxBorders =
      document.getElementById('menuTextBoxBorders').checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuEditableText').addEventListener(
  'click',
  function () {
    state.editableText = document.getElementById('menuEditableText').checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuDisplayOCR').addEventListener(
  'click',
  function () {
    state.displayOCR = document.getElementById('menuDisplayOCR').checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuFontBold').addEventListener(
  'click',
  function () {
    state.fontBold = document.getElementById('menuFontBold').checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuEInkMode').addEventListener(
  'click',
  function () {
    state.eInkMode = document.getElementById('menuEInkMode').checked;
    saveState();
    updateProperties();
    if (state.eInkMode) {
      eInkRefresh();
    }
  },
  false
);

document.getElementById('menuToggleOCRTextBoxes').addEventListener(
  'click',
  function () {
    state.toggleOCRTextBoxes = document.getElementById(
      'menuToggleOCRTextBoxes'
    ).checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuBackgroundColor').addEventListener(
  'input',
  function (event) {
    state.backgroundColor = event.target.value;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuAdvanced').addEventListener(
  'click',
  () => {
    settingsDialog.showModal();
    sentenceField.value = state.sentenceField;
    pictureField.value = state.pictureField;
    pictureField.disabled = false;
    sentenceField.disabled = false;
    if (pz) {
      pz.pause();
    }
  },
  false
);

settingsDialog.addEventListener('close', (e) => {
  if (pz) {
    pz.resume();
  }
});

document.getElementById('menuAbout').addEventListener(
  'click',
  function () {
    document.getElementById('popupAbout').style.display = 'block';
    document.getElementById('dimOverlay').style.display = 'initial';
  },
  false
);

document.getElementById('menuReset').addEventListener(
  'click',
  function () {
    let page_idx = state.page_idx;
    state = JSON.parse(JSON.stringify(defaultState));
    updateUI();
    updatePage(page_idx);
    updateProperties();
  },
  false
);

document.getElementById('dimOverlay').addEventListener(
  'click',
  function () {
    document.getElementById('popupAbout').style.display = 'none';
    document.getElementById('dimOverlay').style.display = 'none';
    if (pz) {
      pz.resume();
    }
  },
  false
);

document.getElementById('menuFontSize').addEventListener('change', (e) => {
  state.fontSize = e.target.value;
  saveState();
  updateProperties();
});

document.getElementById('pageIdxInput').addEventListener('change', (e) => {
  updatePage(e.target.value - 1);
});

document.getElementById('buttonHideMenu').addEventListener(
  'click',
  function () {
    document.getElementById('showMenuA').style.display = 'inline-block';
    document.getElementById('topMenu').classList.add('hidden');
  },
  false
);

document.getElementById('showMenuA').addEventListener(
  'click',
  function () {
    document.getElementById('showMenuA').style.display = 'none';
    document.getElementById('topMenu').classList.remove('hidden');
  },
  false
);

document
  .getElementById('buttonLeftLeft')
  .addEventListener('click', inputLeftLeft, false);
document
  .getElementById('buttonLeft')
  .addEventListener('click', inputLeft, false);
document
  .getElementById('buttonRight')
  .addEventListener('click', inputRight, false);
document
  .getElementById('buttonRightRight')
  .addEventListener('click', inputRightRight, false);

document.addEventListener('keydown', function onEvent(e) {
  switch (e.key) {
    case 'PageUp':
      prevPage();
      break;

    case 'PageDown':
      nextPage();
      break;

    case 'Home':
      firstPage();
      break;

    case 'End':
      lastPage();
      break;

    case ' ':
      nextPage();
      break;
  }
});

function isPageFirstOfPair(page_idx) {
  if (state.singlePageView) {
    return true;
  } else {
    if (state.hasCover) {
      return page_idx === 0 || page_idx % 2 === 1;
    } else {
      return page_idx % 2 === 0;
    }
  }
}

function getPage(page_idx) {
  return document.getElementById('page' + page_idx);
}

function firstPage() {
  updatePage(0);
}

function lastPage() {
  updatePage(num_pages - 1);
}

function prevPage() {
  updatePage(state.page_idx - (state.singlePageView ? 1 : 2));
}

function nextPage() {
  updatePage(state.page_idx + (state.singlePageView ? 1 : 2));
}

function inputLeftLeft() {
  if (state.r2l) {
    lastPage();
  } else {
    firstPage();
  }
}

function inputLeft() {
  if (state.r2l) {
    nextPage();
  } else {
    prevPage();
  }
}

function inputRight() {
  if (state.r2l) {
    prevPage();
  } else {
    nextPage();
  }
}

function inputRightRight() {
  if (state.r2l) {
    firstPage();
  } else {
    lastPage();
  }
}

function eInkRefresh() {
  pc.classList.add('inverted');
  document.body.style.backgroundColor = 'black';
  setTimeout(function () {
    pc.classList.remove('inverted');
    document.body.style.backgroundColor =
      r.style.getPropertyValue('--colorBackground');
  }, 300);
}

const dialog = document.getElementById('dialog');
const sentenceInput = document.getElementById('sentence-input');
const confirmBtn = dialog.querySelector('#confirm-btn');
let cropper;

dialog.addEventListener('close', (e) => {
  if (pz) {
    pz.resume();
  }
  cropper.destroy();
});

function updateLast(sentence, img) {
  const image = document.getElementById('crop-image');
  image.setAttribute('src', img);
  sentenceInput.value = sentence;

  cropper = new Cropper(image, {
    viewMode: 1,
    zoomable: false,
    dragMode: 'none',
  });

  dialog.showModal();
  if (pz) {
    pz.pause();
  }
}

function ankiConnect(action, version, params = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('error', () => reject('failed to issue request'));
    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw 'response has an unexpected number of fields';
        }
        if (!response.hasOwnProperty('error')) {
          throw 'response is missing required error field';
        }
        if (!response.hasOwnProperty('result')) {
          throw 'response is missing required result field';
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });

    xhr.open('POST', 'http://127.0.0.1:8765');
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

confirmBtn.addEventListener('click', async (event) => {
  event.preventDefault();

  const cropped = cropper
    .getCroppedCanvas()
    .toDataURL('image/webp')
    .split(';base64,')[1];

  const notesToday = await ankiConnect('findNotes', 6, { query: 'added:1' });
  const id = notesToday.sort().at(-1);

  await ankiConnect('guiBrowse', 6, { query: 'nid:1' });
  await ankiConnect('updateNoteFields', 6, {
    note: {
      id,
      fields: {
        [state.sentenceField]: sentenceInput.value,
      },
      picture: {
        filename: `_${id}.webp`,
        data: cropped,
        fields: [state.pictureField],
      },
    },
  });
  await ankiConnect('guiBrowse', 6, { query: `nid:${id}` });

  dialog.close();
});

function exportSettings() {
  const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
    JSON.stringify(state)
  )}`;
  const link = document.createElement('a');
  link.href = jsonString;
  link.download = 'settings.json';
  link.click();
}

const fileInput = document.getElementById('import-input');
const exportButton = document.getElementById('export-button');

fileInput.addEventListener('change', importSettings);
exportButton.addEventListener('click', exportSettings);

function importSettings() {
  const [file] = fileInput.files;
  const reader = new FileReader();

  reader.addEventListener('load', () => {
    const page_idx = state.page_idx;
    state = JSON.parse(reader.result);
    updateUI();
    updatePage(page_idx);
    updateProperties();
    location.reload();
  });

  if (file) {
    reader.readAsText(file);
  }
}
