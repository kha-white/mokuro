import json
import shutil
from difflib import SequenceMatcher

import numpy as np
import pytest
from loguru import logger

from mokuro.run import run

MAX_COORD_DIFF = 2
MAX_FONT_SIZE_REL_DIFF = 0.02
MAX_TEXT_DIFF_CHARS = 2
MIN_TEXT_SIMILARITY = 0.95


@pytest.mark.parametrize(
    "input_dir_name,disable_html",
    [
        ("test0", True),
        ("test0", False),
        ("test1_webp", True),
        ("test4_avif", True),
        ("test3_convert_legacy_ocr", False),
        ("test3_convert_legacy_ocr", True),
    ],
)
@pytest.mark.parametrize("disable_ocr", [True, False])
def test_mokuro(
    input_dir_name, disable_ocr, disable_html, tmp_path, input_data_root, expected_results_root, regenerate
):
    input_dir, expected_results_dir = _setup_and_run(
        input_dir_name, disable_ocr, False, disable_html, tmp_path, input_data_root, expected_results_root, regenerate
    )

    assert disable_html != (input_dir / "vol1.html").is_file()

    json_paths = sorted((input_dir / "_ocr/vol1").iterdir())
    expected_json_paths = sorted((expected_results_dir / "_ocr/vol1").iterdir())
    _validate_cache_jsons(json_paths, expected_json_paths)

    mokuro_paths = sorted(input_dir.glob("*.mokuro"))
    expected_mokuro_paths = sorted(expected_results_dir.glob("*.mokuro"))
    _validate_mokuro_files(mokuro_paths, expected_mokuro_paths)


@pytest.mark.parametrize("input_dir_name", ["test2_zip"])
@pytest.mark.parametrize("unzip", [True, False])
def test_mokuro_zip(input_dir_name, unzip, tmp_path, input_data_root, expected_results_root, regenerate):
    input_dir, expected_results_dir = _setup_and_run(
        input_dir_name, False, unzip, True, tmp_path, input_data_root, expected_results_root, regenerate
    )

    json_paths = sorted((input_dir / "_ocr/vol1").iterdir())
    expected_json_paths = sorted((expected_results_dir / "_ocr/vol1").iterdir())
    _validate_cache_jsons(json_paths, expected_json_paths)

    mokuro_paths = sorted(input_dir.glob("*.mokuro"))
    expected_mokuro_paths = sorted(expected_results_dir.glob("*.mokuro"))
    _validate_mokuro_files(mokuro_paths, expected_mokuro_paths)

    if unzip:
        assert (input_dir / "vol1").is_dir()

        mokuro = json.loads((input_dir / "vol1.mokuro").read_text(encoding="utf-8"))
        for page in mokuro["pages"]:
            assert (input_dir / "vol1" / page["img_path"]).is_file()

    else:
        assert not (input_dir / "vol1").exists()


def _setup_and_run(
    input_dir_name, disable_ocr, unzip, disable_html, tmp_path, input_data_root, expected_results_root, regenerate
):
    input_dir = tmp_path / input_dir_name
    tag = input_dir_name
    if disable_ocr:
        tag += "_disable_ocr"
    if unzip:
        tag += "_unzip"
    if disable_html:
        tag += "_disable_html"
    expected_results_dir = expected_results_root / tag

    shutil.copytree(input_data_root / input_dir_name, input_dir)
    run(
        parent_dir=input_dir,
        force_cpu=True,
        disable_confirmation=True,
        disable_ocr=disable_ocr,
        unzip=unzip,
        legacy_html=not disable_html,
    )

    if regenerate:
        logger.warning("Regenerating expected results")
        shutil.rmtree(expected_results_dir, ignore_errors=True)
        shutil.copytree(
            input_dir, expected_results_dir, ignore=shutil.ignore_patterns("*.jpg", "*.webp", "*.avif", "*.zip")
        )

    return input_dir, expected_results_dir


def _validate_cache_jsons(json_paths, expected_json_paths):
    assert [path.name for path in expected_json_paths] == [path.name for path in json_paths]

    for json_path, expected_json_path in zip(json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding="utf-8"))
        expected_result = json.loads(expected_json_path.read_text(encoding="utf-8"))
        _validate_page(result, expected_result, json_path.name)


def _validate_mokuro_files(json_paths, expected_json_paths):
    assert [path.name for path in expected_json_paths] == [path.name for path in json_paths]

    for json_path, expected_json_path in zip(json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding="utf-8"))
        expected_result = json.loads(expected_json_path.read_text(encoding="utf-8"))

        assert result["title"] == expected_result["title"]
        assert result["volume"] == expected_result["volume"]
        assert len(result["pages"]) == len(expected_result["pages"])

        for page, expected_page in zip(result["pages"], expected_result["pages"]):
            assert page["img_path"] == expected_page["img_path"]
            _validate_page(page, expected_page, f"{json_path.name}:{page['img_path']}")


def _validate_page(page, expected_page, label):
    """Compare a page against expected results, tolerating small numerical and OCR differences.

    Results depend on the exact versions of the image decoding, detection and OCR libraries, so
    coordinates can shift by a pixel and the odd ambiguous glyph can be read differently. The
    structure of the result has to match exactly.
    """
    assert page["img_width"] == expected_page["img_width"], label
    assert page["img_height"] == expected_page["img_height"], label
    assert len(page["blocks"]) == len(expected_page["blocks"]), label

    for i, (block, expected_block) in enumerate(zip(page["blocks"], expected_page["blocks"])):
        block_label = f"{label} block {i}"
        assert block["vertical"] == expected_block["vertical"], block_label
        assert block["font_size"] == pytest.approx(expected_block["font_size"], rel=MAX_FONT_SIZE_REL_DIFF), block_label
        _validate_coords(block["box"], expected_block["box"], block_label)
        _validate_coords(block["lines_coords"], expected_block["lines_coords"], block_label)

    text = _page_text(page)
    expected_text = _page_text(expected_page)
    matcher = SequenceMatcher(None, text, expected_text)

    # a few characters may differ on any page, and a small fraction of a long one
    diff = sum(max(i2 - i1, j2 - j1) for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag != "equal")
    assert diff <= MAX_TEXT_DIFF_CHARS or matcher.ratio() >= MIN_TEXT_SIMILARITY, (
        f"{label}: {diff} characters differ\n{text}\n{expected_text}"
    )


def _validate_coords(coords, expected_coords, label):
    coords = np.asarray(coords, dtype=float)
    expected_coords = np.asarray(expected_coords, dtype=float)

    assert coords.shape == expected_coords.shape, label
    max_diff = np.abs(coords - expected_coords).max(initial=0)
    assert max_diff <= MAX_COORD_DIFF, f"{label}: coordinates differ by {max_diff}"


def _page_text(page):
    return "".join(line for block in page["blocks"] for line in block["lines"])
