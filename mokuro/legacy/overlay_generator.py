import shutil
from pathlib import Path
from urllib.parse import quote

import numpy as np
from loguru import logger
from yattag import Doc

from mokuro import __version__
from mokuro.env import ASSETS_PATH
from mokuro.utils import load_json
from mokuro.volume import Volume

SCRIPT_PATH = Path(__file__).parent / "script.js"
STYLES_PATH = Path(__file__).parent / "styles.css"
PANZOOM_PATH = ASSETS_PATH / "panzoom.min.js"
ICONS_PATH = ASSETS_PATH / "icons"

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

ABOUT_DEMO = (
    ABOUT
    + """
<br/>
<p>This demo contains excerpt from <a href="http://www.manga109.org/en/download_s.html" target="_blank">Manga109-s dataset</a>.</p>
<p>うちの猫’ず日記 &copy; がぁさん</p>
"""
)


def generate_legacy_html(volume: Volume, as_one_file=True, is_demo=False, ignore_errors=False):
    assert volume.path_in.is_dir(), f"{volume.path_in} must be a directory"
    out_dir = volume.path_title

    if not as_one_file:
        shutil.copy(SCRIPT_PATH, out_dir / "script.js")
        shutil.copy(STYLES_PATH, out_dir / "styles.css")
        shutil.copy(PANZOOM_PATH, out_dir / "panzoom.min.js")

    img_paths = volume.get_img_paths()

    page_htmls = []

    for img_path_rel in img_paths.values():
        try:
            json_path = (volume.path_ocr_cache / img_path_rel).with_suffix(".json")
            assert json_path.is_file(), f"missing {json_path}"
            result = load_json(json_path)
            page_html = get_page_html(result, volume.path_in.name / img_path_rel)
            page_htmls.append(page_html)
        except Exception as e:
            if ignore_errors:
                logger.error(e)
            else:
                raise e

    if is_demo:
        html_title = f"mokuro {__version__} demo"
    else:
        html_title = f"{volume.name} | mokuro"
    index_html = get_index_html(page_htmls, html_title, as_one_file, is_demo)
    (out_dir / (volume.path_in.name + ".html")).write_text(index_html, encoding="utf-8")


def get_index_html(page_htmls, html_title, as_one_file=True, is_demo=False):
    doc, tag, text = Doc().tagtext()

    with tag("html"):
        doc.asis('<meta content="text/html;charset=utf-8" http-equiv="Content-Type">')
        doc.asis('<meta content="utf-8" http-equiv="encoding">')
        doc.asis(
            '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, user-scalable=no"/>'
        )

        with tag("head"):
            with tag("title"):
                text(html_title)

            if as_one_file:
                with tag("style"):
                    doc.asis(STYLES_PATH.read_text())
            else:
                with tag("link", rel="stylesheet", href="styles.css"):
                    pass

        with tag("body"):
            top_menu(doc, tag, text, len(page_htmls))

            with tag("div", id="dimOverlay"):
                pass

            with tag("div", id="popupAbout", klass="popup"):
                if is_demo:
                    doc.asis(ABOUT_DEMO)
                else:
                    doc.asis(ABOUT)

            with tag("a", id="leftAScreen", href="#"):
                pass

            with tag("a", id="rightAScreen", href="#"):
                pass

            with tag("div", id="pagesContainer"):
                for i, page_html in enumerate(page_htmls):
                    with tag("div", id=f"page{i}", klass="page"):
                        doc.asis(page_html)

                with tag("a", id="leftAPage", href="#"):
                    pass

                with tag("a", id="rightAPage", href="#"):
                    pass

            if as_one_file:
                with tag("script"):
                    doc.asis(PANZOOM_PATH.read_text())

                with tag("script"):
                    doc.asis(SCRIPT_PATH.read_text())
            else:
                with tag("script", src="panzoom.min.js"):
                    pass

                with tag("script", src="script.js"):
                    pass

                if is_demo:
                    with tag("script"):
                        doc.asis("showAboutOnStart=true;")

    html = doc.getvalue()
    return html


def top_menu(doc, tag, text, num_pages):
    with tag("a", id="showMenuA", href="#"):
        pass

    with tag("div", id="topMenu"):
        with tag("button", id="buttonHideMenu", klass="menuButton"):
            doc.asis(get_icon("cross-svgrepo-com"))

        with tag("button", id="buttonLeftLeft", klass="menuButton"):
            doc.asis(get_icon("chevron-left-double-svgrepo-com"))

        with tag("button", id="buttonLeft", klass="menuButton"):
            doc.asis(get_icon("chevron-left-svgrepo-com"))

        with tag("button", id="buttonRight", klass="menuButton"):
            doc.asis(get_icon("chevron-right-svgrepo-com"))

        with tag("button", id="buttonRightRight", klass="menuButton"):
            doc.asis(get_icon("chevron-right-double-svgrepo-com"))

        with tag("input", "required", type="number", id="pageIdxInput", min=1, max=num_pages, value=1, size=3):
            pass

        with tag("span", id="pageIdxDisplay"):
            pass

        # workaround for yomichan including the menu bar in the {sentence} field when mining for some reason
        with tag("span", style="color:rgba(255,255,255,0.1);font-size:1px;"):
            text("。")

        dropdown_menu(doc, tag, text)


def dropdown_menu(doc, tag, text):
    def option_click(id_, text_content):
        with tag("a", href="#", klass="dropdown-option", id=id_):
            text(text_content)

    def option_toggle(id_, text_content):
        with tag("label", klass="dropdown-option"):
            text(text_content)

            with tag("input", type="checkbox", id=id_):
                pass

    def option_select(id_, text_content, values):
        with tag("label", klass="dropdown-option"):
            text(text_content)
            with tag("select", id=id_):
                for value in values:
                    with tag("option", value=value):
                        text(value)

    def option_color(id_, text_content, value):
        with tag("label", klass="dropdown-option"):
            text(text_content)
            with tag("input", type="color", value=value, id=id_):
                pass

    with tag("div", klass="dropdown"):
        with tag("button", id="dropbtn", klass="menuButton"):
            doc.asis(get_icon("menu-hamburger-svgrepo-com"))

        with tag("div", klass="dropdown-content"):
            with tag("div", klass="buttonRow"):
                with tag("button", id="menuFitToScreen", klass="menuButton"):
                    doc.asis(get_icon("expand-svgrepo-com"))
                with tag("button", id="menuFitToWidth", klass="menuButton"):
                    doc.asis(get_icon("expand-width-svgrepo-com"))
                with tag("button", id="menuOriginalSize", klass="menuButton"):
                    text("1:1")
                with tag("button", id="menuFullScreen", klass="menuButton"):
                    doc.asis(get_icon("fullscreen-svgrepo-com"))

            option_select(
                "menuDefaultZoom",
                "on page turn: ",
                [
                    "fit to screen",
                    "fit to width",
                    "original size",
                    "keep zoom level",
                ],
            )
            option_toggle("menuR2l", "right to left")
            option_toggle("menuDoublePageView", "display two pages ")
            option_toggle("menuHasCover", "first page is cover ")
            option_toggle("menuCtrlToPan", "ctrl+mouse to move ")
            option_toggle("menuDisplayOCR", "OCR enabled ")
            option_toggle("menuTextBoxBorders", "display boxes outlines ")
            option_toggle("menuEditableText", "editable text ")
            option_select("menuFontSize", "font size: ", ["auto", 9, 10, 11, 12, 14, 16, 18, 20, 24, 32, 40, 48, 60])
            option_toggle("menuEInkMode", "e-ink mode ")
            option_toggle("menuToggleOCRTextBoxes", "toggle OCR text boxes on click")
            option_color("menuBackgroundColor", "background color", "#C4C3D0")
            option_click("menuReset", "reset settings")
            option_click("menuAbout", "about/help")


def get_page_html(result, img_path):
    doc, tag, text = Doc().tagtext()

    # assign z-index ordering from largest to smallest boxes,
    # so that smaller boxes don't get hidden underneath larger ones
    if len(result["blocks"]) > 0:
        boxes = np.array([b["box"] for b in result["blocks"]])
        areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
        z_idxs = np.argsort(np.argsort(-areas)) + 10
    else:
        z_idxs = []

    with tag("div", klass="pageContainer", style=get_container_style(result, quote(str(img_path.as_posix())))):
        for result_blk, z_index in zip(result["blocks"], z_idxs):
            box_style = get_box_style(result_blk, z_index, result["img_width"], result["img_height"])
            with tag("div", klass="textBox", style=box_style):
                for line in result_blk["lines"]:
                    with tag("p"):
                        text(line)

    html = doc.getvalue()
    return html


def get_box_style(result_blk, z_index, W, H, expand=0):
    xmin, ymin, xmax, ymax = result_blk["box"]
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
        "left": xmin,
        "top": ymin,
        "width": w,
        "height": h,
        "font-size": f"{font_size}px",
        "z-index": z_index,
    }

    if result_blk["vertical"]:
        box_style["writing-mode"] = "vertical-rl"

    box_style = " ".join(f"{k}:{v};" for k, v in box_style.items())
    return box_style


def get_container_style(result, img_path):
    style = {"width": result["img_width"], "height": result["img_height"], "background-image": f'url("{img_path}")'}

    style = " ".join(f"{k}:{v};" for k, v in style.items())
    return style


def get_icon(name):
    return (ICONS_PATH / name).with_suffix(".svg").read_text()
