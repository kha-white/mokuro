import shutil
from pathlib import Path
from urllib.parse import quote

import numpy as np
from loguru import logger
from natsort import natsorted
from tqdm import tqdm
from yattag import Doc

from mokuro import __version__
from mokuro.env import ASSETS_PATH
from mokuro.manga_page_ocr import MangaPageOcr
from mokuro.utils import dump_json, load_json

SCRIPT_PATH = Path(__file__).parent / 'script.js'
STYLES_PATH = Path(__file__).parent / 'styles.css'
COMMON_SCRIPT_PATH = Path(__file__).parent / 'common.js'
COMMON_STYLES_PATH = Path(__file__).parent / 'common.css'
MOBILE_SCRIPT_PATH = Path(__file__).parent / 'script.mobile.js'
MOBILE_STYLES_PATH = Path(__file__).parent / 'styles.mobile.css'

PANZOOM_PATH = ASSETS_PATH / 'panzoom.min.js'
ICONS_PATH = ASSETS_PATH / 'icons'
CROPPER_JS_PATH = ASSETS_PATH / 'cropper.min.js'
CROPPER_CSS_PATH = ASSETS_PATH / 'cropper.min.css'

ABOUT = f"""
<p>HTML overlay generated with <a href="https://github.com/kha-white/mokuro" target="_blank">mokuro</a> version {__version__}</p>
<p>Instructions:</p>
<ul>
<li>Navigate pages with:
    <ul>
    <li>menu buttons</li>
    <li>Page Up, Page Down, Home, End keys</li>
    <li>by clicking left/right edge of the screen</li>
    </ul>
<li>Click &#10005; button to hide the menu. To bring it back, clip top-left corner of the screen.</li>
<li>Select "editable boxes" option, to edit text recognized by OCR. Changes are not saved, it's only for ad-hoc fixes when using look-up dictionary.</li>
<li>E-ink mode turns off animations and simulates display refresh on each page turn.</li>
</ul>
"""

ABOUT_DEMO = ABOUT + """
<br/>
<p>This demo contains excerpt from <a href="http://www.manga109.org/en/download_s.html" target="_blank">Manga109-s dataset</a>.</p>
<p>うちの猫’ず日記 &copy; がぁさん</p>
"""

MOBILE_ABOUT = f"""
<p>This is a temporary <a href="https://github.com/ZXY101/mokuro" target="_blank">fork</a> of <a href="https://github.com/kha-white/mokuro" target="_blank">mokuro</a></p>
<p>The main aim of this fork is to try and improve the mobile viewing experience</p>
<p><b>This file should only be be viewed on a mobile device since it relies on the browsers default handling for panning & zooming</b></p>
<p>To navigate, you can use the buttons in the top menu; the new buttons at the bottom of the screen or swipe to navigate.</p>
<p>Recommended to be used with <a href="https://github.com/lrorpilla/jidoujisho" target="_blank">jidoujisho</a></p>
"""

class OverlayGenerator:
    def __init__(self,
                 pretrained_model_name_or_path='kha-white/manga-ocr-base',
                 force_cpu=False,
                 **kwargs):
        self.pretrained_model_name_or_path = pretrained_model_name_or_path
        self.force_cpu = force_cpu
        self.kwargs = kwargs
        self.mpocr = None

    def init_models(self):
        if self.mpocr is None:
            self.mpocr = MangaPageOcr(self.pretrained_model_name_or_path, self.force_cpu, **self.kwargs)

    def convert_to_mobile(self, path, as_one_file=True, mobile=True, is_demo=False):
        out_dir = path.parent
        path_name = path.name.replace(".html", "")
        suffix = path.suffix.lower()

        if not path.is_file():
            logger.error('Invalid file. Did you set the path correctly?')
            return

        if suffix == '.html':
            f = open(path, 'r', encoding='utf-8')
            text = f.read()
            f.close()

            start = text.find('<div id="pagesContainer">')
            end = text.find('<script>')

            max_start = text.find('max="') + 5
            max_end = text.find('"', max_start)

            page_count = text[max_start:max_end]
            pages = text[start:end]
            title = f'{path_name} | mokuro'
            mobile_file = path_name + '.mobile.html'

            index_html = self.get_index_html(title=title, pages=pages, as_one_file=as_one_file, is_demo=is_demo, mobile=True, page_count=page_count )
            (out_dir / mobile_file).write_text(index_html, encoding='utf-8')
            logger.info(f'{mobile_file} successfully generated')
        else:
            logger.error('Please specify a valid .html file')
        return

    def process_dir(self, path, as_one_file=True, mobile=False, is_demo=False):
        path = Path(path).expanduser().absolute()
        assert path.is_dir(), f'{path} must be a directory'
        if path.stem == '_ocr':
            logger.info(f'Skipping OCR directory: {path}')
            return
        out_dir = path.parent

        results_dir = out_dir / '_ocr' / path.name
        results_dir.mkdir(parents=True, exist_ok=True)

        if mobile:
            no_media_file_path = path / '.nomedia'
            no_media_file = open(no_media_file_path, 'w')
            no_media_file.close()

        if not as_one_file:
            shutil.copy(COMMON_SCRIPT_PATH, out_dir / 'common.js')
            shutil.copy(COMMON_STYLES_PATH, out_dir / 'common.css')
            shutil.copy(SCRIPT_PATH, out_dir / 'script.js')
            shutil.copy(STYLES_PATH, out_dir / 'styles.css')
            shutil.copy(PANZOOM_PATH, out_dir / 'panzoom.min.js')
            shutil.copy(CROPPER_JS_PATH, out_dir / 'cropper.min.js')
            shutil.copy(CROPPER_CSS_PATH, out_dir / 'cropper.min.css')
            if mobile:
                shutil.copy(MOBILE_SCRIPT_PATH, out_dir / 'script.mobile.js')
                shutil.copy(MOBILE_STYLES_PATH, out_dir / 'styles.mobile.css')

        img_paths = [p for p in path.glob('**/*') if p.is_file() and p.suffix.lower() in ('.jpg', '.jpeg', '.png')]
        img_paths = natsorted(img_paths)

        page_htmls = []

        for img_path in tqdm(img_paths, desc='Processing pages...'):
            json_path = (results_dir / img_path.relative_to(path)).with_suffix('.json')
            if json_path.is_file():
                result = load_json(json_path)
            else:
                self.init_models()
                result = self.mpocr(img_path)
                json_path.parent.mkdir(parents=True, exist_ok=True)
                dump_json(result, json_path)

            page_html = self.get_page_html(result, img_path.relative_to(out_dir))
            page_htmls.append(page_html)

        if is_demo:
            title = f'mokuro {__version__} demo'
        else:
            title = f'{path.name} | mokuro'
        index_html = self.get_index_html(page_htmls, title, as_one_file, False, is_demo, )
        (out_dir / (path.name + '.html')).write_text(index_html, encoding='utf-8')
        if mobile:
            index_html = self.get_index_html(page_htmls, title, as_one_file, mobile, is_demo, )
            (out_dir / (path.name + '.mobile.html')).write_text(index_html, encoding='utf-8')

    def get_index_html(self, page_htmls=None, title='Mokuro', as_one_file=True, mobile=False, is_demo=False, pages=None, page_count=None):
        doc, tag, text = Doc().tagtext()
        def text_input(id_, text_content):
            with tag('label', klass='form-item'):
                with tag('label'):
                    text(text_content)
                with tag('input', type='text', id=id_, klass='text-input'):
                    pass
        def toggle_input(id_, text_content):
            with tag('label', klass='form-item'):
                with tag('label'):
                    text(text_content)
                with tag('input', type='checkbox', id=id_):
                    pass
        def file_input(id_, text_content):
            with tag('label', klass='form-item'):
                with tag('label'):
                    text(text_content)
                with tag('input', type='file', id=id_, accept='.json'):
                    pass

        with tag('html'):
            doc.asis('<meta content="text/html;charset=utf-8" http-equiv="Content-Type">')
            doc.asis('<meta content="utf-8" http-equiv="encoding">')
            if mobile:
                doc.asis('<meta name="viewport" content="width=device-width, initial-scale=1"/>')
            else:
                doc.asis('<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, user-scalable=no"/>')

            with tag('head'):
                with tag('title'):
                    text(title)

                if as_one_file:
                    with tag('style'):
                        if mobile:
                            doc.asis(MOBILE_STYLES_PATH.read_text())
                        else:
                            doc.asis(STYLES_PATH.read_text())
                    with tag('style'):
                        doc.asis(CROPPER_CSS_PATH.read_text())
                    with tag('style'):
                        doc.asis(COMMON_STYLES_PATH.read_text())
                else:
                    if mobile:
                        with tag('link', rel='stylesheet', href='styles.mobile.css'):
                            pass
                    else:
                        with tag('link', rel='stylesheet', href='styles.css'):
                            pass
                    with tag('link', rel='stylesheet', href='common.css'):
                        pass

            with tag('body'):
                with tag('dialog', id='dialog', klass='modal'):
                    with tag('div', klass='dialog-container'):
                        with tag('h2'):
                            text('Quick Edit')
                        with tag('img', id='crop-image'):
                            pass
                        with tag('form', id='dialog-actions'):
                            with tag('button', klass='dialog-button', value='cancel', formmethod='dialog'):
                                text('Cancel')
                            with tag('textarea', id='sentence-input'):
                                pass
                            with tag('button', klass='dialog-button', id='confirm-btn', formmethod='dialog'):
                                text('Confirm')
                with tag('dialog', id='settings-dialog', klass='modal'):
                    with tag('div', klass='dialog-container'):
                        with tag('h2'):
                            text('Advanced settings')
                            pass
                        toggle_input('connect-enabled', 'Enable anki connect integration?')
                        toggle_input('edit-sentence-enabled', 'Update sentence field?')
                        toggle_input('crop-enabled', 'Crop picture before updating note?')
                        text_input('sentence-field-input', 'Sentence field:')
                        text_input('picture-field-input', 'Picture field:')
                        file_input('import-input', 'Import settings:')
                        with tag('button', id='export-button', klass='dialog-button'):
                            text('Export settings')
                        with tag('form', id='dialog-actions'):
                            with tag('button', klass='dialog-button', value='cancel', formmethod='dialog'):
                                text('Close')

                if page_count is not None:
                    self.top_menu(doc, tag, text, page_count, mobile)
                else:
                    self.top_menu(doc, tag, text, len(page_htmls), mobile)

                with tag('div', id='dimOverlay'):
                    pass

                with tag('div', id='popupAbout', klass='popup'):
                    if is_demo:
                        doc.asis(ABOUT_DEMO)
                    else:
                        if mobile:
                            doc.asis(MOBILE_ABOUT)
                        else:
                            doc.asis(ABOUT)

                with tag('div', id='page-num'):
                    pass

                with tag('button', id='back', klass='btn'):
                    text('<') 
                    pass

                with tag('button', id='forward', klass='btn'):
                    text('>') 
                    pass

                if not mobile:
                    with tag('a', id='leftAScreen', href='#'):
                        pass
                    
                    with tag('a', id='rightAScreen', href='#'):
                        pass

                if pages is not None:
                    doc.asis(pages)
                else:
                    with tag('div', id='pagesContainer'):
                        for i, page_html in enumerate(page_htmls):
                            with tag('div', id=f'page{i}', klass='page'):
                                doc.asis(page_html)
                        if not mobile:
                            with tag('a', id='leftAPage', href='#'):
                                pass

                            with tag('a', id='rightAPage', href='#'):
                                pass

                with tag('div', id='preload-image'):
                    pass

                if as_one_file:
                    with tag('script'):
                            doc.asis(COMMON_SCRIPT_PATH.read_text())
                    with tag('script'):
                            doc.asis(CROPPER_JS_PATH.read_text())
                    if mobile:
                        with tag('script'):
                            doc.asis(MOBILE_SCRIPT_PATH.read_text())
                    else:
                        with tag('script'):
                            doc.asis(PANZOOM_PATH.read_text())
                        
                        with tag('script'):
                            doc.asis(SCRIPT_PATH.read_text())
                else:
                    with tag('script', src='cropper.min.js'):
                        pass
                    with tag('style', src='cropper.min.css'):
                        pass
                    if mobile :
                        with tag('script', src='script.mobile.js'):
                            pass
                    else:
                        with tag('script', src='panzoom.min.js'):
                            pass
                        with tag('script', src='script.js'):
                            pass

                    if is_demo:
                        with tag('script'):
                            doc.asis('showAboutOnStart=true;')

        html = doc.getvalue()
        return html

    def top_menu(self, doc, tag, text, num_pages, mobile):
        with tag('a', id='showMenuA', href='#'):
            pass

        with tag('div', id='topMenu'):
            with tag('button', id='buttonHideMenu', klass='menuButton'):
                doc.asis(self.get_icon('cross-svgrepo-com'))

            with tag('button', id='buttonLeftLeft', klass='menuButton'):
                doc.asis(self.get_icon('chevron-left-double-svgrepo-com'))

            with tag('button', id='buttonLeft', klass='menuButton'):
                doc.asis(self.get_icon('chevron-left-svgrepo-com'))

            with tag('button', id='buttonRight', klass='menuButton'):
                doc.asis(self.get_icon('chevron-right-svgrepo-com'))

            with tag('button', id='buttonRightRight', klass='menuButton'):
                doc.asis(self.get_icon('chevron-right-double-svgrepo-com'))

            with tag('input', 'required', type='number', id='pageIdxInput',
                     min=1, max=num_pages, value=1, size=3):
                pass

            with tag('span', id='pageIdxDisplay'):
                pass

            # workaround for yomichan including the menu bar in the {sentence} field when mining for some reason
            with tag('span', style='color:rgba(255,255,255,0.1);font-size:1px;'):
                text('。')

            self.dropdown_menu(doc, tag, text, mobile)

    def dropdown_menu(self, doc, tag, text, mobile):
        def option_click(id_, text_content):
            with tag('a', href='#', klass='dropdown-option', id=id_):
                text(text_content)

        def option_toggle(id_, text_content):
            with tag('label', klass='dropdown-option'):
                text(text_content)
                with tag('input', type='checkbox', id=id_):
                    pass

        def option_select(id_, text_content, values):
            with tag('label', klass='dropdown-option'):
                text(text_content)
                with tag('select', id=id_):
                    for value in values:
                        with tag('option', value=value):
                            text(value)
        def option_range(id_, text_content, min, max, value):
                    with tag('label', klass='dropdown-option'):
                        text(text_content)
                        with tag('input', type='range', min=min, max=max, value=value, id=id_):
                            pass
        def option_color(id_, text_content, value):
                    with tag('label', klass='dropdown-option'):
                        text(text_content)
                        with tag('input', type='color',  value=value, id=id_):
                            pass
        with tag('div', klass='dropdown'):
            with tag('button', id='dropbtn', klass='menuButton'):
                doc.asis(self.get_icon('menu-hamburger-svgrepo-com'))

            with tag('div', klass='dropdown-content'):
                if not mobile:
                    with tag('div', klass='buttonRow'):
                        with tag('button', id='menuFitToScreen', klass='menuButton'):
                            doc.asis(self.get_icon('expand-svgrepo-com'))
                        with tag('button', id='menuFitToWidth', klass='menuButton'):
                            doc.asis(self.get_icon('expand-width-svgrepo-com'))
                        with tag('button', id='menuOriginalSize', klass='menuButton'):
                            text('1:1')
                        with tag('button', id='menuFullScreen', klass='menuButton'):
                            doc.asis(self.get_icon('fullscreen-svgrepo-com'))

                    option_select('menuDefaultZoom', 'on page turn: ', [
                        'fit to screen',
                        'fit to width',
                        'original size',
                        'keep zoom level',
                    ])

                option_toggle('menuR2l', 'right to left')
                if not mobile:
                    option_toggle('menuDoublePageView', 'display two pages ')
                option_toggle('menuHasCover', 'first page is cover ')
                if not mobile:
                    option_toggle('menuCtrlToPan', 'ctrl+mouse to move ')
                option_toggle('menuDisplayOCR', 'OCR enabled ')
                option_toggle('menuTextBoxBorders', 'display boxes outlines ')
                option_toggle('menuEditableText', 'editable text ')
                option_select('menuFontSize', 'font size: ',
                              ['auto', 9, 10, 11, 12, 14, 16, 18, 20, 24, 32, 40, 48, 60])
                option_toggle('menuFontBold', 'bold font')
                option_toggle('menuEInkMode', 'e-ink mode ')
                option_toggle('menuToggleOCRTextBoxes', 'toggle OCR text boxes on click')
                if mobile:
                    option_range('menuSwipeThreshold', 'swipe threshold', '10', '90', '25')
                    option_color('menuBackgroundColor', 'background color', '#000')
                    option_toggle('menuShowNav', 'show bottom navigation')
                    option_toggle('menuPageNum', 'show page number')
                else:
                    option_color('menuBackgroundColor', 'background color', '#C4C3D0')
                option_click('menuAdvanced', 'advanced settings')
                option_click('menuReset', 'reset settings')
                option_click('menuAbout', 'about/help')

    def get_page_html(self, result, img_path):
        doc, tag, text = Doc().tagtext()

        # assign z-index ordering from largest to smallest boxes,
        # so that smaller boxes don't get hidden underneath larger ones
        if len(result['blocks']) > 0:
            boxes = np.array([b['box'] for b in result['blocks']])
            areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
            z_idxs = np.argsort(np.argsort(-areas)) + 10
        else:
            z_idxs = []

        with tag('div', klass='pageContainer', style=self.get_container_style(result, quote(str(img_path.as_posix())))):
            for result_blk, z_index in zip(result['blocks'], z_idxs):
                box_style = self.get_box_style(result_blk, z_index, result['img_width'], result['img_height'])
                with tag('div', klass='textBox', style=box_style):
                    with tag('div', ('onclick', f'updateLast("{"".join(result_blk["lines"])}", "{quote(str(img_path.as_posix()))}")'), klass='connect-button', ):
                        pass
                    for line in result_blk['lines']:
                        with tag('p'):
                            text(line)

        html = doc.getvalue()
        return html

    @staticmethod
    def get_box_style(result_blk, z_index, W, H, expand=0):
        xmin, ymin, xmax, ymax = result_blk['box']
        w = xmax - xmin
        h = ymax - ymin

        xmin = np.clip(xmin - int(w * expand / 2), 0, W)
        ymin = np.clip(ymin - int(h * expand / 2), 0, H)
        xmax = np.clip(xmax + int(w * expand / 2), 0, W)
        ymax = np.clip(ymax + int(h * expand / 2), 0, H)

        w = xmax - xmin
        h = ymax - ymin

        font_size = result_blk["font_size"]
        font_size = np.clip(font_size, 12, 32)

        box_style = {
            'left': xmin,
            'top': ymin,
            'width': w,
            'height': h,
            'font-size': f'{font_size}px',
            'z-index': z_index,
        }

        if result_blk['vertical']:
            box_style['writing-mode'] = 'vertical-rl'

        box_style = ' '.join(f'{k}:{v};' for k, v in box_style.items())
        return box_style

    @staticmethod
    def get_container_style(result, img_path):
        style = {
            'width': result['img_width'],
            'height': result['img_height'],
            'background-image': f'url("{img_path}")'
        }

        style = ' '.join(f'{k}:{v};' for k, v in style.items())
        return style

    @staticmethod
    def get_icon(name):
        return (ICONS_PATH / name).with_suffix('.svg').read_text()
