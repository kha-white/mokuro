import shutil
from pathlib import Path
from urllib.parse import quote

import numpy as np
from tqdm import tqdm
from yattag import Doc

from manga_ocr_overlay import __version__
from manga_ocr_overlay.manga_page_ocr import MangaPageOcr
from manga_ocr_overlay.utils import dump_json, load_json

SCRIPT_PATH = Path(__file__).parent / 'script.js'
STYLES_PATH = Path(__file__).parent / 'styles.css'
PANZOOM_PATH = Path(__file__).parent.parent / 'assets' / 'panzoom.min.js'

ABOUT = f"""
<p>HTML overlay generated with <a href="https://github.com/kha-white/manga-ocr-overlay" target="_blank">manga-ocr-overlay</a> version {__version__}</p>
"""


class OverlayGenerator:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.mpocr = None

    def process_dir(self, path):
        path = Path(path)
        out_dir = path.parent

        results_dir = out_dir / '_ocr' / path.name
        results_dir.mkdir(parents=True, exist_ok=True)

        shutil.copy(SCRIPT_PATH, out_dir / 'script.js')
        shutil.copy(STYLES_PATH, out_dir / 'styles.css')
        shutil.copy(PANZOOM_PATH, out_dir / 'panzoom.min.js')

        img_paths = [p for p in sorted(path.glob('**/*')) if p.is_file() and p.suffix in ('.jpg', '.jpeg', '.png')]

        page_htmls = []

        for img_path in tqdm(img_paths, desc='Processing pages...'):
            json_path = (results_dir / img_path.relative_to(path)).with_suffix('.json')
            if json_path.is_file():
                result = load_json(json_path)
            else:
                if self.mpocr is None:
                    self.mpocr = MangaPageOcr(**self.kwargs)
                result = self.mpocr(img_path)
                json_path.parent.mkdir(parents=True, exist_ok=True)
                dump_json(result, json_path)

            page_html = self.get_page_html(result, img_path.relative_to(out_dir))
            page_htmls.append(page_html)

        index_html = self.get_index_html(page_htmls)
        (out_dir / path.name).with_suffix('.html').write_text(index_html, encoding='utf-8')

    def get_index_html(self, page_htmls):
        doc, tag, text = Doc().tagtext()

        with tag('html'):
            doc.asis('<meta content="text/html;charset=utf-8" http-equiv="Content-Type">')
            doc.asis('<meta content="utf-8" http-equiv="encoding">')
            doc.asis(
                '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, user-scalable=no"/>')

            with tag('head'):
                with tag('link', rel='stylesheet', href='styles.css'): pass

            with tag('body'):
                self.top_menu(doc, tag, text, len(page_htmls))

                with tag('div', id='dimOverlay'):
                    pass

                with tag('div', id='popupAbout', klass='popup'):
                    doc.asis(ABOUT)

                with tag('a', id='leftAScreen', href='#'):
                    pass

                with tag('a', id='rightAScreen', href='#'):
                    pass

                with tag('div', id='pagesContainer'):
                    for i, page_html in enumerate(page_htmls):
                        with tag('div', id=f'page{i}', klass='page'):
                            doc.asis(page_html)

                    with tag('a', id='leftAPage', href='#'):
                        pass

                    with tag('a', id='rightAPage', href='#'):
                        pass

                with tag('script', src='panzoom.min.js'):
                    pass

                with tag('script', src='script.js'):
                    pass

        html = doc.getvalue()
        return html

    def top_menu(self, doc, tag, text, num_pages):
        with tag('div', id='topMenu'):
            with tag('button', id='buttonLeftLeft', klass='menuButton'):
                text('|<')

            with tag('button', id='buttonLeft', klass='menuButton'):
                text('<')

            with tag('button', id='buttonRight', klass='menuButton'):
                text('>')

            with tag('button', id='buttonRightRight', klass='menuButton'):
                text('>|')

            with tag('input', 'required', type='number', id='pageIdxInput',
                     min=1, max=num_pages, value=1, size=3):
                pass

            with tag('span', id='pageIdxDisplay'):
                pass

            # workaround for yomichan including the menu bar in the {sentence} field when mining for some reason
            with tag('span', style='color:rgba(255,255,255,0.1);font-size:1px;'):
                text('。')

            self.dropdown_menu(doc, tag, text)

    def dropdown_menu(self, doc, tag, text):
        def option_click(id_, text_content):
            with tag('a', href='#', klass='dropdown-option', id=id_):
                text(text_content)

        def option_toggle(id_, text_content, init_value):
            with tag('label', klass='dropdown-option'):
                text(text_content)

                if init_value:
                    with tag('input', type='checkbox', id=id_, checked=True):
                        pass
                else:
                    with tag('input', type='checkbox', id=id_):
                        pass

        def option_select(id_, text_content, values):
            with tag('label', klass='dropdown-option'):
                text(text_content)
                with tag('select', id=id_):
                    for value in values:
                        with tag('option', value=value):
                            text(value)

        with tag('div', klass='dropdown'):
            with tag('button', id='dropbtn', klass='menuButton'):
                text('☰')

            with tag('div', klass='dropdown-content'):
                option_click('menuFitToScreen', 'fit to screen')
                option_click('menuFitToWidth', 'fit to width')
                option_click('menuResetZoom', 'original size')
                option_click('menuFullScreen', 'toggle fullscreen')
                option_toggle('menuR2l', 'right to left', True)
                option_toggle('menuDoublePageView', 'display two pages ', True)
                option_toggle('menuHasCover', 'first page is cover ', False)
                option_toggle('menuCtrlToPan', 'ctrl+mouse to move ', False)
                option_toggle('menuDisplayOCR', 'OCR enabled ', True)
                option_toggle('menuTextBoxBorders', 'display boxes outlines ', True)
                option_toggle('menuEditableText', 'editable text ', False)
                option_select('menuFontSize', 'font size: ',
                              ['auto', 9, 10, 11, 12, 14, 16, 18, 20, 24, 32, 40, 48, 60])
                option_click('menuAbout', 'about')

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


def run(path):
    path = Path(path).expanduser().absolute()
    m2h = OverlayGenerator()
    for p in path.iterdir():
        if p.is_dir() and p.stem != '_ocr':
            m2h.process_dir(p)
