let num_pages = -1;
let pc = document.getElementById('pagesContainer');
let r = document.querySelector(':root');
let showAboutOnStart = false;

let storageKey = 'mokuro_' + window.location.pathname;

let defaultState = {
  page_idx: 0,
  page2_idx: -1,
  hasCover: false,
  r2l: false,
  singlePageView: true,
  textBoxBorders: false,
  editableText: false,
  displayOCR: true,
  fontSize: 'auto',
  eInkMode: false,
  toggleOCRTextBoxes: false,
  swipeThreshold: 25,
  backgroundColor: '#000',
};

let state = JSON.parse(JSON.stringify(defaultState));

function fitToScreen() {
  const viewportmeta = document.querySelector('meta[name=viewport]');
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

  viewportmeta.setAttribute(
    'content',
    'initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0'
  );

  pc.style.transformOrigin = `top left`;
  pc.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

  viewportmeta.setAttribute(
    'content',
    'initial-scale=1.0, minimum-scale=1.0, maximum-scale=10.0'
  );
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
  document.getElementById('menuHasCover').checked = state.hasCover;
  document.getElementById('menuTextBoxBorders').checked = state.textBoxBorders;
  document.getElementById('menuEditableText').checked = state.editableText;
  document.getElementById('menuDisplayOCR').checked = state.displayOCR;
  document.getElementById('menuFontSize').value = state.fontSize;
  document.getElementById('menuEInkMode').checked = state.eInkMode;
  document.getElementById('menuToggleOCRTextBoxes').checked =
    state.toggleOCRTextBoxes;
  document.getElementById('menuSwipeThreshold').value = state.swipeThreshold;
  document.getElementById('menuBackgroundColor').value = state.backgroundColor;
}

window.addEventListener('resize', () => {
  fitToScreen();
});

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

  if (state.backgroundColor) {
      r.style.setProperty('--colorBackground', state.backgroundColor)
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

document.getElementById('menuSwipeThreshold').addEventListener(
  'input',
  function (event) {
    state.swipeThreshold = event.target.value;
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
document.getElementById('forward').addEventListener('click', inputRight, false);
document.getElementById('back').addEventListener('click', inputLeft, false);

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

  fitToScreen();
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

const screenWidth =
  window.innerWidth ||
  document.documentElement.clientWidth ||
  document.body.clientWidth;
const screenHeight =
  window.innerHeight ||
  document.documentElement.clientHeight ||
  document.body.clientHeight;

document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchend', handleTouchEnd);
document.addEventListener('touchmove', handleTouchMove);
document.addEventListener('touchcancel', handleTouchCancel);

let startX;
let touchIds = [];
const ongoingTouches = [];
let distance;

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
  distance = 0;
  startX = event.touches[0].clientX;

  const touches = event.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    ongoingTouches.push(touches[i]);
  }
}

function ongoingTouchIndexById(idToFind) {
  for (let i = 0; i < ongoingTouches.length; i++) {
    const id = ongoingTouches[i].identifier;

    if (id === idToFind) {
      return i;
    }
  }
  return -1;
}

function handleTouchMove(event) {
  const touches = event.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    const idx = ongoingTouchIndexById(touches[i].identifier);
    if (idx === 0) {
      distance = Math.floor(touches[i].clientX - startX);
    } else {
      distance = 0;
    }
  }
}

function handleTouchEnd(event) {
  const touches = event.changedTouches;
  const swipeThreshold = Math.abs((state.swipeThreshold / 100) * screenWidth);

  for (let i = 0; i < touches.length; i++) {
    const idx = ongoingTouchIndexById(touches[i].identifier);
    if (idx === 0 && touches.length === 1) {
      if (distance > swipeThreshold) {
        inputLeft();
      } else if (distance < swipeThreshold * -1) {
        inputRight();
      }
    }
  }
  distance - 0;
}

function handleTouchCancel(event) {
  removeTouch(event);
}
