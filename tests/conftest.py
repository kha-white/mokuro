from pathlib import Path

import pytest


def pytest_addoption(parser):
    parser.addoption("-R", "--regenerate", action="store_true", default=False)


@pytest.fixture
def regenerate(request):
    return request.config.getoption("--regenerate")


@pytest.fixture
def test_data_root():
    return Path(__file__).parent / 'data'


@pytest.fixture
def input_data_root(test_data_root):
    return test_data_root / 'input'


@pytest.fixture
def expected_results_root(test_data_root):
    return test_data_root / 'expected_results'
