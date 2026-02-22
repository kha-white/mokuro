import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

import mokuro.cache as cache_module


def _new_instance(tmp_path):
    """Create a cache instance with root in tmp_path, bypassing __init__ side effects."""
    CacheClass = type(cache_module.cache)
    instance = CacheClass.__new__(CacheClass)
    instance.root = tmp_path / "manga-ocr"
    instance.root.mkdir(parents=True, exist_ok=True)
    return instance


class TestCacheInit:
    def test_root_falls_back_to_home_when_xdg_not_set(self, tmp_path):
        CacheClass = type(cache_module.cache)
        env = {k: v for k, v in os.environ.items() if k != "XDG_CACHE_HOME"}
        with patch.dict(os.environ, env, clear=True):
            with patch("pathlib.Path.home", return_value=tmp_path):
                instance = CacheClass()
        assert instance.root == tmp_path / ".cache" / "manga-ocr"

    def test_root_uses_xdg_cache_home_when_set(self, tmp_path):
        CacheClass = type(cache_module.cache)
        with patch.dict(os.environ, {"XDG_CACHE_HOME": str(tmp_path)}):
            instance = CacheClass()
        assert instance.root == tmp_path / "manga-ocr"

    def test_root_dir_created_on_init(self, tmp_path):
        subdir = tmp_path / "cache_dir"
        CacheClass = type(cache_module.cache)
        env = {k: v for k, v in os.environ.items() if k != "XDG_CACHE_HOME"}
        with patch.dict(os.environ, env, clear=True):
            with patch("pathlib.Path.home", return_value=subdir):
                instance = CacheClass()
        assert instance.root.is_dir()


class TestDownloadIfNeeded:
    def test_no_download_when_file_exists(self, tmp_path):
        instance = _new_instance(tmp_path)
        file_path = instance.root / "test.pt"
        file_path.touch()

        with patch("mokuro.cache.requests.get") as mock_get:
            instance._download_if_needed(file_path, "http://example.com/test.pt")

        mock_get.assert_not_called()

    def test_downloads_when_file_missing(self, tmp_path):
        instance = _new_instance(tmp_path)
        file_path = instance.root / "test.pt"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.iter_content.return_value = [b"chunk1", b"chunk2"]

        with patch("mokuro.cache.requests.get", return_value=mock_response) as mock_get:
            instance._download_if_needed(file_path, "http://example.com/test.pt")

        mock_get.assert_called_once_with("http://example.com/test.pt", stream=True, verify=True)
        assert file_path.read_bytes() == b"chunk1chunk2"

    def test_raises_on_non_200_response(self, tmp_path):
        instance = _new_instance(tmp_path)
        file_path = instance.root / "test.pt"

        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("mokuro.cache.requests.get", return_value=mock_response):
            with pytest.raises(RuntimeError, match="Failed downloading"):
                instance._download_if_needed(file_path, "http://example.com/test.pt")


class TestComicTextDetector:
    def test_returns_correct_path(self, tmp_path):
        instance = _new_instance(tmp_path)
        expected_path = instance.root / "comictextdetector.pt"
        expected_path.touch()

        assert instance.comic_text_detector == expected_path
