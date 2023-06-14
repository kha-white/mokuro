let num_pages = -1;
let pc = document.getElementById('pagesContainer');
let r = document.querySelector(':root');
let showAboutOnStart = false;
const preload = document.getElementById('preload-image');

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
  swipeThreshold: 35,
  backgroundColor: '#000',
  showNav: true,
  showPageNum: true,
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
  document.getElementById('menuFontBold').checked = state.fontBold;
  document.getElementById('menuEInkMode').checked = state.eInkMode;
  document.getElementById('menuToggleOCRTextBoxes').checked =
    state.toggleOCRTextBoxes;
  document.getElementById('menuSwipeThreshold').value = state.swipeThreshold;
  document.getElementById('menuBackgroundColor').value = state.backgroundColor;
  document.getElementById('menuShowNav').checked = state.showNav;
  document.getElementById('menuPageNum').checked = state.showPageNum;
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
    r.style.setProperty('--pageNumDisplay', 'initial');
  } else {
    r.style.setProperty('--pageNumDisplay', 'none');
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
  preloadImage();
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
