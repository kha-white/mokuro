import json
import shutil

import pytest
from loguru import logger

from mokuro.run import run


@pytest.mark.parametrize('input_dir_name', ['test0', 'test1_webp'])
@pytest.mark.parametrize('disable_ocr', [True, False])
def test_mokuro(input_dir_name,
                disable_ocr,
                tmp_path,
                input_data_root,
                expected_results_root,
                regenerate):
    input_dir = tmp_path / input_dir_name
    tag = input_dir_name + ('_disable_ocr' if disable_ocr else '')
    expected_results_dir = expected_results_root / tag

    shutil.copytree(input_data_root / input_dir_name, input_dir)
    run(parent_dir=input_dir, force_cpu=True, disable_confirmation=True, disable_ocr=disable_ocr)

    if regenerate:
        logger.warning('Regenerating expected results')
        shutil.rmtree(expected_results_dir, ignore_errors=True)
        shutil.copytree(input_dir, expected_results_dir, ignore=shutil.ignore_patterns('*.jpg', '*.webp'))

    assert (input_dir / 'vol1.html').is_file()

    json_paths = sorted((input_dir / '_ocr/vol1').iterdir())
    expected_json_paths = sorted((expected_results_dir / '_ocr/vol1').iterdir())

    assert [path.name for path in expected_json_paths] == [path.name for path in json_paths]

    for json_path, expected_json_path in zip(json_paths, expected_json_paths):
        result = json.loads(json_path.read_text(encoding='utf-8'))
        expected_result = json.loads(expected_json_path.read_text(encoding='utf-8'))

        assert result == expected_result
