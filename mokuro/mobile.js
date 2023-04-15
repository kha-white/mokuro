let num_pages = -1;
let pc = document.getElementById('pagesContainer');
let r = document.querySelector(':root');
let showAboutOnStart = false;

let storageKey = 'mokuro_' + window.location.pathname;

let defaultState = {
  page_idx: 0,
  page2_idx: -1,
  hasCover: false,
  r2l: true,
  singlePageView: false,
  ctrlToPan: false,
  textBoxBorders: false,
  editableText: false,
  displayOCR: true,
  fontSize: 'auto',
  eInkMode: false,
  defaultZoomMode: 'fit to screen',
  toggleOCRTextBoxes: false,
};

let state = JSON.parse(JSON.stringify(defaultState));

function fitToScreen() {
  const page = getPage(state.page_idx);
  const pageContainer = page.querySelector('div');
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const elementWidth = pageContainer.style.width.replace('px', '');
  const elementHeight = pageContainer.style.height.replace('px', '');

  const scaleX = screenWidth / elementWidth;
  const scaleY = screenHeight / elementHeight;
  const scale = Math.min(scaleX, scaleY);

  const translateX = (screenWidth - elementWidth * scale) / 2;
  const translateY = (screenHeight - elementHeight * scale) / 2;

  pc.style.transformOrigin = `top left`;
  pc.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

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

function updateUI() {
  document.getElementById('menuR2l').checked = state.r2l;
  document.getElementById('menuCtrlToPan').checked = state.ctrlToPan;
  document.getElementById('menuDoublePageView').checked = !state.singlePageView;
  document.getElementById('menuHasCover').checked = state.hasCover;
  document.getElementById('menuTextBoxBorders').checked = state.textBoxBorders;
  document.getElementById('menuEditableText').checked = state.editableText;
  document.getElementById('menuDisplayOCR').checked = state.displayOCR;
  document.getElementById('menuFontSize').value = state.fontSize;
  document.getElementById('menuEInkMode').checked = state.eInkMode;
  document.getElementById('menuDefaultZoom').value = state.defaultZoomMode;
  document.getElementById('menuToggleOCRTextBoxes').checked =
    state.toggleOCRTextBoxes;
}

document.addEventListener(
  'DOMContentLoaded',
  function () {
    loadState();
    fitToScreen();
    num_pages = document.getElementsByClassName('page').length;

    updatePage(state.page_idx);
    initTextBoxes();

    if (showAboutOnStart) {
      document.getElementById('popupAbout').style.display = 'block';
      document.getElementById('dimOverlay').style.display = 'initial';
    }
  },
  false
);

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

function updateProperties() {
  if (state.textBoxBorders) {
    r.style.setProperty('--textBoxBorderHoverColor', 'rgba(237, 28, 36, 0.3)');
  } else {
    r.style.setProperty('--textBoxBorderHoverColor', 'rgba(0, 0, 0, 0)');
  }

  pc.contentEditable = state.editableText;

  if (state.displayOCR) {
    r.style.setProperty('--textBoxDisplay', 'initial');
  } else {
    r.style.setProperty('--textBoxDisplay', 'none');
  }

  if (state.fontSize === 'auto') {
    pc.classList.remove('textBoxFontSizeOverride');
  } else {
    r.style.setProperty('--textBoxFontSize', state.fontSize + 'pt');
    pc.classList.add('textBoxFontSizeOverride');
  }

  if (state.eInkMode) {
    document.getElementById('topMenu').classList.add('notransition');
  } else {
    document.getElementById('topMenu').classList.remove('notransition');
  }
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

document.getElementById('menuCtrlToPan').addEventListener(
  'click',
  function () {
    state.ctrlToPan = document.getElementById('menuCtrlToPan').checked;
    saveState();
  },
  false
);

document.getElementById('menuDoublePageView').addEventListener(
  'click',
  function () {
    state.singlePageView =
      !document.getElementById('menuDoublePageView').checked;
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
  },
  false
);

document.getElementById('menuFontSize').addEventListener('change', (e) => {
  state.fontSize = e.target.value;
  saveState();
  updateProperties();
});

document.getElementById('menuDefaultZoom').addEventListener('change', (e) => {
  state.defaultZoomMode = e.target.value;
  saveState();
});

document.getElementById('pageIdxInput').addEventListener('change', (e) => {
  updatePage(e.target.value - 1);
});

document.getElementById('buttonHideMenu').addEventListener(
  'click',
  function () {
    // document.getElementById('topMenu').style.display = "none";
    document.getElementById('showMenuA').style.display = 'inline-block';
    document.getElementById('topMenu').classList.add('hidden');
  },
  false
);

document.getElementById('showMenuA').addEventListener(
  'click',
  function () {
    // document.getElementById('topMenu').style.display = "initial";
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
document
  .getElementById('leftAPage')
  .addEventListener('click', inputLeft, false);
document
  .getElementById('leftAScreen')
  .addEventListener('click', inputLeft, false);
document
  .getElementById('rightAPage')
  .addEventListener('click', inputRight, false);
document
  .getElementById('rightAScreen')
  .addEventListener('click', inputRight, false);

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

function updatePage(new_page_idx) {
  new_page_idx = Math.min(Math.max(new_page_idx, 0), num_pages - 1);

  getPage(state.page_idx).style.display = 'none';

  if (state.page2_idx >= 0) {
    getPage(state.page2_idx).style.display = 'none';
  }

  if (isPageFirstOfPair(new_page_idx)) {
    state.page_idx = new_page_idx;
  } else {
    state.page_idx = new_page_idx - 1;
  }

  getPage(state.page_idx).style.display = 'inline-block';
  getPage(state.page_idx).style.order = 2;

  if (
    !state.singlePageView &&
    state.page_idx < num_pages - 1 &&
    !isPageFirstOfPair(state.page_idx + 1)
  ) {
    state.page2_idx = state.page_idx + 1;
    getPage(state.page2_idx).style.display = 'inline-block';

    if (state.r2l) {
      getPage(state.page2_idx).style.order = 1;
    } else {
      getPage(state.page2_idx).style.order = 3;
    }
  } else {
    state.page2_idx = -1;
  }

  document.getElementById('pageIdxInput').value = state.page_idx + 1;

  page2_txt = state.page2_idx >= 0 ? ',' + (state.page2_idx + 1) : '';
  document.getElementById('pageIdxDisplay').innerHTML =
    state.page_idx + 1 + page2_txt + '/' + num_pages;

  document.getElementById('page-num').innerHTML =
    state.page_idx + 1 + '/' + num_pages;

  saveState();
  if (state.eInkMode) {
    eInkRefresh();
  }
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

// get the screen dimensions
const screenWidth =
  window.innerWidth ||
  document.documentElement.clientWidth ||
  document.body.clientWidth;
const screenHeight =
  window.innerHeight ||
  document.documentElement.clientHeight ||
  document.body.clientHeight;

// add event listeners for touchstart and touchmove
document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchend', handleTouchEnd);
document.addEventListener('touchcancel', handleTouchCancel);

// define variables to store touch coordinates
let startX, startY;
let touchIds = [];

function removeTouch(event) {
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    const touchIndex = touchIds.indexOf(touch.identifier);
    if (touchIndex >= 0) {
      touchIds.splice(touchIndex, 1);
    }
  }
}

function handleTouchStart(event) {
  // store the coordinates of the touch
  startX = event.touches[0].clientX;
  startY = event.touches[0].clientY;
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    touchIds.push(touch.identifier);
  }
}

function handleTouchEnd(event) {
  removeTouch(event);
  if (touchIds.length === 0) {
    const endX = event.changedTouches[0].clientX;

    if (startX - endX > 120) {
      nextPage();
    } else if (startX - endX < -120) {
      prevPage();
    }
  }
}

function handleTouchCancel(event) {
  // decrement the number of active touch points
  removeTouch(event);
}
