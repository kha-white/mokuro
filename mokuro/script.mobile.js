const defaultState = {
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
  swipeThreshold: 35,
  backgroundColor: '#000',
  menuPreloadAmount: 5,
  showNav: true,
  showPageNum: true,
  connectEnabled: false,
  editSentence: true,
  cropImage: true,
  overwriteImage: true,
  sentenceField: 'Sentence',
  pictureField: 'Picture',
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

function updateUI() {
  document.getElementById('menuR2l').checked = state.r2l;
  document.getElementById('menuHasCover').checked = state.hasCover;
  document.getElementById('menuTextBoxBorders').checked = state.textBoxBorders;
  document.getElementById('menuEditableText').checked = state.editableText;
  document.getElementById('menuDisplayOCR').checked = state.displayOCR;
  document.getElementById('menuFontSize').value = state.fontSize;
  document.getElementById('menuFontBold').checked = state.fontBold;
  document.getElementById('menuEInkMode').checked = state.eInkMode;
  document.getElementById('menuToggleOCRTextBoxes').checked =
    state.toggleOCRTextBoxes;
  document.getElementById('menuSwipeThreshold').value = state.swipeThreshold;
  document.getElementById('menuPreloadAmount').value = state.preloadAmount;
  document.getElementById('menuBackgroundColor').value = state.backgroundColor;
  document.getElementById('menuShowNav').checked = state.showNav;
  document.getElementById('menuPageNum').checked = state.showPageNum;
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

  if (state.fontBold) {
    r.style.setProperty('--textBoxFontWeight', 'bold');
  } else {
    r.style.setProperty('--textBoxFontWeight', 'normal');
  }

  if (state.eInkMode) {
    document.getElementById('topMenu').classList.add('notransition');
  } else {
    document.getElementById('topMenu').classList.remove('notransition');
  }

  if (state.backgroundColor) {
    r.style.setProperty('--colorBackground', state.backgroundColor);
  }

  if (state.showNav) {
    r.style.setProperty('--navDisplay', 'initial');
  } else {
    r.style.setProperty('--navDisplay', 'none');
  }

  if (state.showPageNum) {
    r.style.setProperty('--pageNumOpacity', '1');
  } else {
    r.style.setProperty('--pageNumOpacity', '0');
  }

  if (state.connectEnabled) {
    r.style.setProperty('--connectButtonDisplay', 'block');
  } else {
    r.style.setProperty('--connectButtonDisplay', 'none');
    r.style.setProperty('--sentenceConnectButtonDisplay', 'none');
  }

  if (state.editSentence && state.connectEnabled) {
    r.style.setProperty('--sentenceInputDisplay', 'block');
    r.style.setProperty('--sentenceConnectButtonDisplay', 'block');
  } else {
    r.style.setProperty('--sentenceInputDisplay', 'none');
    r.style.setProperty('--sentenceConnectButtonDisplay', 'none');
  }
}

document.getElementById('menuSwipeThreshold').addEventListener(
  'input',
  function (event) {
    state.swipeThreshold = event.target.value;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuShowNav').addEventListener(
  'click',
  function () {
    state.showNav = document.getElementById('menuShowNav').checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('menuPageNum').addEventListener(
  'click',
  function () {
    state.showPageNum = document.getElementById('menuPageNum').checked;
    saveState();
    updateProperties();
  },
  false
);

document.getElementById('forward').addEventListener('click', inputRight, false);
document.getElementById('back').addEventListener('click', inputLeft, false);

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
  preloadImage();
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
let startY;
const ongoingTouches = [];
let distanceX;
let distanceY;

function removeTouch(event) {
  const touches = event.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const touchIndex = ongoingTouches.indexOf(touch.identifier);

    if (touchIndex >= 0) {
      ongoingTouches.splice(touchIndex, 1);
    }
  }
}

function handleTouchStart(event) {
  const touches = event.changedTouches;

  distanceY = 0;
  distanceX = 0;
  startX = event.touches[0].clientX;
  startY = event.touches[0].clientY;

  ongoingTouches.push(touches[0].identifier);
}

function handleTouchMove(event) {
  const touches = event.changedTouches;

  if (ongoingTouches.length === 1) {
    distanceX = Math.floor(touches[0].clientX - startX);
    distanceY = Math.floor(touches[0].clientY - startY);
  } else {
    distanceX = 0;
    distanceY = 0;
  }
}

function handleNavigation() {
  const swipeThreshold = Math.abs((state.swipeThreshold / 100) * screenWidth);
  const isSwipe = distanceY < 100 && distanceY > 200 * -1;

  if (ongoingTouches.length === 1 && isSwipe) {
    if (distanceX > swipeThreshold) {
      inputLeft();
    } else if (distanceX < swipeThreshold * -1) {
      inputRight();
    }
  }
}

let timeout;
let running = false;
function handleTouchEnd(event) {
  if (!running) {
    running = true;
    handleNavigation();
    removeTouch(event);
    distanceX = 0;
    distanceY = 0;
    timeout = setTimeout(() => {
      running = false;
    }, 100);
  } else {
    removeTouch(event);
    distanceX = 0;
    distanceY = 0;
  }
}

function handleTouchCancel(event) {
  removeTouch(event);
}

document.getElementById('page-num').addEventListener('click', () => {
  if (state.connectEnabled) {
    const page = getPage(state.page_idx);
    const img = getBackgroundImage(page);
    updateLast('', img);
  }
});
