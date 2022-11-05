import json
import shutil
from pathlib import Path

from loguru import logger

from mokuro.run import run

TEST_DATA_ROOT = Path(__file__).parent / 'data'


def test_mokuro(tmp_path):
    volumes_path = tmp_path / 'volumes'

    logger.info(f'volumes path: {volumes_path}')

    shutil.copytree(TEST_DATA_ROOT / 'volumes/vol1', volumes_path / 'vol1')
    run(parent_dir=volumes_path, force_cpu=True, disable_confirmation=True)

    json_paths = sorted((volumes_path / '_ocr/vol1').iterdir())
    expected_json_paths = sorted((TEST_DATA_ROOT / 'volumes/_ocr/vol1').iterdir())

    assert (volumes_path / 'vol1.html').is_file()

    assert [path.name for path in expected_json_paths] == [path.name for path in json_paths]

    for json_path, expected_json_path in zip(json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding='utf-8'))
        expected_result = json.loads(expected_json_path.read_text(encoding='utf-8'))

        assert result == expected_result
