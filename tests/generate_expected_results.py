import shutil
from pathlib import Path

from mokuro.run import run

TEST_DATA_ROOT = Path(__file__).parent / 'data'


def generate_expected_results():
    shutil.rmtree(TEST_DATA_ROOT / 'volumes/_ocr')
    run(parent_dir=(TEST_DATA_ROOT / 'volumes'), force_cpu=True, disable_confirmation=True)


if __name__ == '__main__':
    generate_expected_results()
