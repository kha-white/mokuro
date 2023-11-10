import json
import shutil
from pathlib import Path
import pytest

from loguru import logger

from mokuro.run import run

TEST_DATA_ROOT = Path(__file__).parent / 'data'

@pytest.mark.parametrize("input_path, expected_output_file", [
    ("vol1", Path("vol1.html")),
    ("vol1_cbz.cbz", Path("vol1.html")),
    ("vol1_epub.epub", Path("vol1.html")),
])

def test_mokuro(tmp_path, input_path, expected_output_file):
    volumes_path = tmp_path / 'volumes'
    volumes_path.mkdir(parents=True, exist_ok=True)
    logger.info(f'volumes path: {volumes_path}')

    test_input_data = TEST_DATA_ROOT / 'volumes' / input_path
    assert test_input_data.exists()

    test_input_destination= volumes_path / input_path
    if test_input_data.is_dir():
        shutil.copytree(test_input_data, volumes_path / input_path)
    else:
        shutil.copy(test_input_data, volumes_path)
    
    run(parent_dir=volumes_path, force_cpu=True, disable_confirmation=True)

    produced_output_path = volumes_path / test_input_data.with_suffix(expected_output_file.suffix).name
    assert (produced_output_path).is_file()

    produced_json_paths = sorted((volumes_path / '_ocr/' / test_input_data.stem).glob('**/*.json'))
    expected_json_paths = sorted((TEST_DATA_ROOT / 'volumes/_ocr' / expected_output_file.stem).glob('**/*.json'))

    assert len(expected_json_paths) == len(produced_json_paths)
    for json_path, expected_json_path in zip(produced_json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding='utf-8'))
        expected_result = json.loads(expected_json_path.read_text(encoding='utf-8'))

        assert result == expected_result