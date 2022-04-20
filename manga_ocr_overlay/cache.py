from pathlib import Path

import requests
from loguru import logger


class cache:
    def __init__(self):
        self.root = Path.home() / '.cache' / 'manga-ocr'
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def comic_text_detector(self):
        path = self.root / 'comictextdetector.pt'
        url = 'https://github.com/zyddnys/manga-image-translator/releases/download/beta-0.2.1/comictextdetector.pt'

        self._download_if_needed(path, url)
        return path

    def _download_if_needed(self, path, url):
        if not path.is_file():
            logger.info(f'Downloading {url}')
            r = requests.get(url, stream=True, verify=True)
            if r.status_code != 200:
                raise RuntimeError(f'Failed downloading {url}')
            with path.open('wb') as f:
                for chunk in r.iter_content(1024):
                    if chunk:
                        f.write(chunk)
            logger.info(f'Finished downloading {url}')


cache = cache()
