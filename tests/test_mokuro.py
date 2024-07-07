import json
import shutil

import pytest
from loguru import logger

from mokuro.run import run


@pytest.mark.parametrize(
    "input_dir_name,disable_html",
    [
        ("test0", True),
        ("test0", False),
        ("test1_webp", True),
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
        shutil.copytree(input_dir, expected_results_dir, ignore=shutil.ignore_patterns("*.jpg", "*.webp", "*.zip"))

    return input_dir, expected_results_dir


def _validate_cache_jsons(json_paths, expected_json_paths):
    assert [path.name for path in expected_json_paths] == [path.name for path in json_paths]

    for json_path, expected_json_path in zip(json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding="utf-8"))
        expected_result = json.loads(expected_json_path.read_text(encoding="utf-8"))

        for json_ in (result, expected_result):
            json_.pop("version")

        assert result == expected_result


def _validate_mokuro_files(json_paths, expected_json_paths):
    assert [path.name for path in expected_json_paths] == [path.name for path in json_paths]

    for json_path, expected_json_path in zip(json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding="utf-8"))
        expected_result = json.loads(expected_json_path.read_text(encoding="utf-8"))

        for json_ in (result, expected_result):
            json_.pop("version")
            json_.pop("title_uuid")
            json_.pop("volume_uuid")

            for page in json_["pages"]:
                page.pop("version")

        assert result == expected_result
