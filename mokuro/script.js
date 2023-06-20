const defaultState = {
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
  backgroundColor: '#C4C3D0',
  menuPreloadAmount: 5,
  connectEnabled: false,
  editSentence: true,
  cropImage: true,
  easyNav: true,
  overwriteImage: true,
  sentenceField: 'Sentence',
  pictureField: 'Picture',
};

let state = JSON.parse(JSON.stringify(defaultState));

function updateUI() {
  document.getElementById('menuR2l').checked = state.r2l;
  document.getElementById('menuCtrlToPan').checked = state.ctrlToPan;
  document.getElementById('menuDoublePageView').checked = !state.singlePageView;
  document.getElementById('menuHasCover').checked = state.hasCover;
  document.getElementById('menuTextBoxBorders').checked = state.textBoxBorders;
  document.getElementById('menuEditableText').checked = state.editableText;
  document.getElementById('menuDisplayOCR').checked = state.displayOCR;
  document.getElementById('menuFontSize').value = state.fontSize;
  document.getElementById('menuFontBold').checked = state.fontBold;
  document.getElementById('menuEInkMode').checked = state.eInkMode;
  document.getElementById('menuDefaultZoom').value = state.defaultZoomMode;
  document.getElementById('menuToggleOCRTextBoxes').checked =
    state.toggleOCRTextBoxes;
  document.getElementById('menuEasyNav').checked = state.easyNav;
  document.getElementById('menuBackgroundColor').value = state.backgroundColor;
  document.getElementById('menuPreloadAmount').value = state.preloadAmount;
}

document.addEventListener(
  'DOMContentLoaded',
  function () {
    loadState();
    num_pages = document.getElementsByClassName('page').length;
    generateConnectButtons();

    pz = panzoom(pc, {
      bounds: true,
      boundsPadding: 0.05,
      maxZoom: 10,
      minZoom: 0.1,
      zoomDoubleClickSpeed: 1,
      enableTextSelection: true,

      beforeMouseDown: function (e) {
        let shouldIgnore =
          disablePanzoomOnElement(e.target) ||
          e.target.closest('.textBox') !== null ||
          (state.ctrlToPan && !e.ctrlKey);
        return shouldIgnore;
      },

      beforeWheel: function (e) {
        let shouldIgnore = disablePanzoomOnElement(e.target);
        return shouldIgnore;
      },

      onTouch: function (e) {
        if (disablePanzoomOnElement(e.target)) {
          e.stopPropagation();
          return false;
        }

        if (e.touches.length > 1) {
          return true;
        } else {
          return false;
        }
      },
    });

    updatePage(state.page_idx);
    initTextBoxes();

    if (showAboutOnStart) {
      document.getElementById('popupAbout').style.display = 'block';
      document.getElementById('dimOverlay').style.display = 'initial';
      pz.pause();
    }
  },
  false
);

function disablePanzoomOnElement(element) {
  return document.getElementById('topMenu').contains(element);
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

  if (state.easyNav) {
    r.style.setProperty('--navBtnDisplay', 'block');
  } else {
    r.style.setProperty('--navBtnDisplay', 'none');
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

document.getElementById('menuEasyNav').addEventListener(
  'click',
  function () {
    state.easyNav = document.getElementById('menuEasyNav').checked;
    saveState();
    updateProperties();
  },
  false
);

document
  .getElementById('menuOriginalSize')
  .addEventListener('click', zoomOriginal, false);
document
  .getElementById('menuFitToWidth')
  .addEventListener('click', zoomFitToWidth, false);
document
  .getElementById('menuFitToScreen')
  .addEventListener('click', zoomFitToScreen, false);
document
  .getElementById('menuFullScreen')
  .addEventListener('click', toggleFullScreen, false);

document.getElementById('menuDefaultZoom').addEventListener('change', (e) => {
  state.defaultZoomMode = e.target.value;
  saveState();
});

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

function getOffsetLeft() {
  return 0;
}

function getOffsetTop() {
  let offset = 0;
  let menu = document.getElementById('topMenu');
  if (!menu.classList.contains('hidden')) {
    offset += menu.getBoundingClientRect().bottom + 10;
  }
  return offset;
}

function getOffsetRight() {
  return 0;
}

function getOffsetBottom() {
  return 0;
}

function getScreenWidth() {
  return window.innerWidth - getOffsetLeft() - getOffsetRight();
}

function getScreenHeight() {
  return window.innerHeight - getOffsetTop() - getOffsetBottom();
}

function panAlign(align_x, align_y) {
  let scale = pz.getTransform().scale;
  let x;
  let y;

  switch (align_x) {
    case 'left':
      x = getOffsetLeft();
      break;
    case 'center':
      x = getOffsetLeft() + (getScreenWidth() - pc.offsetWidth * scale) / 2;
      break;
    case 'right':
      x = getOffsetLeft() + (getScreenWidth() - pc.offsetWidth * scale);
      break;
  }

  switch (align_y) {
    case 'top':
      y = getOffsetTop();
      break;
    case 'center':
      y = getOffsetTop() + (getScreenHeight() - pc.offsetHeight * scale) / 2;
      break;
    case 'bottom':
      y = getOffsetTop() + (getScreenHeight() - pc.offsetHeight * scale);
      break;
  }

  pz.moveTo(x, y);
}

function zoomOriginal() {
  pz.moveTo(0, 0);
  pz.zoomTo(0, 0, 1 / pz.getTransform().scale);
  panAlign('center', 'center');
}

function zoomFitToWidth() {
  let scale =
    (1 / pz.getTransform().scale) * (getScreenWidth() / pc.offsetWidth);
  pz.moveTo(0, 0);
  pz.zoomTo(0, 0, scale);
  panAlign('center', 'top');
}

function zoomFitToScreen() {
  let scale_x = getScreenWidth() / pc.offsetWidth;
  let scale_y = getScreenHeight() / pc.offsetHeight;
  let scale = (1 / pz.getTransform().scale) * Math.min(scale_x, scale_y);
  pz.moveTo(0, 0);
  pz.zoomTo(0, 0, scale);
  panAlign('center', 'center');
}

function zoomDefault() {
  switch (state.defaultZoomMode) {
    case 'fit to screen':
      zoomFitToScreen();
      break;
    case 'fit to width':
      zoomFitToWidth();
      break;
    case 'original size':
      zoomOriginal();
      break;
  }
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

  saveState();
  zoomDefault();
  preloadImage();
  if (state.eInkMode) {
    eInkRefresh();
  }
}

function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen =
    docEl.requestFullscreen ||
    docEl.mozRequestFullScreen ||
    docEl.webkitRequestFullScreen ||
    docEl.msRequestFullscreen;
  var cancelFullScreen =
    doc.exitFullscreen ||
    doc.mozCancelFullScreen ||
    doc.webkitExitFullscreen ||
    doc.msExitFullscreen;

  if (
    !doc.fullscreenElement &&
    !doc.mozFullScreenElement &&
    !doc.webkitFullscreenElement &&
    !doc.msFullscreenElement
  ) {
    requestFullScreen.call(docEl);
  } else {
    cancelFullScreen.call(doc);
  }
}

async function inheritHtml(noteId) {
  const htmlTagRegex = RegExp('<[^>]*>(.*?)</[^>]*>', 'ig');

  const [noteInfo] = await ankiConnect('notesInfo', 6, { notes: [noteId] });
  const markedUp = noteInfo?.fields[state.sentenceField]?.value;
  const markedUpWithoutBreaklines = markedUp.replace('<br>', '');
  let inherited = sentenceInput.value;

  while (true) {
    const match = htmlTagRegex.exec(markedUpWithoutBreaklines);

    if (match === null || match.length < 2) {
      break;
    }

    inherited = inherited.replace(match[1], match[0]);
  }

  return inherited;
}

document.getElementById('snackbar').addEventListener('click', async () => {
  const { id } = await getLastCard();
  await ankiConnect('guiBrowse', 6, { query: `nid:${id}` });
});

let start;
let end;

const leftNav = document.getElementById('left-nav');
const rightNav = document.getElementById('right-nav');

leftNav.addEventListener('mousedown', () => {
  start = new Date();
});

rightNav.addEventListener('mousedown', () => {
  start = new Date();
});

leftNav.addEventListener('mouseup', () => {
  end = new Date();
  const clickDuration = end - start;

  if (clickDuration < 200) {
    inputLeft();
  }
});

rightNav.addEventListener('mouseup', () => {
  end = new Date();
  const clickDuration = end - start;

  if (clickDuration < 200) {
    inputRight();
  }
});

function generateConnectButtons() {
  for (let i = 0; i < num_pages; i++) {
    const connectBtn = document.getElementById(`connect-${i}`);

    connectBtn.addEventListener('mousedown', () => {
      start = new Date();
    });

    connectBtn.addEventListener('mouseup', () => {
      end = new Date();
      const clickDuration = end - start;

      if (clickDuration < 200) {
        const page = getPage(i);
        const img = getBackgroundImage(page);
        updateLast('', img);
      }
    });
  }
}
