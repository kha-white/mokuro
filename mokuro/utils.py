import json

import cv2
import numpy as np

import atexit
from pathlib import Path
import shutil
import zipfile

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.generic):
            return obj.item()
        return json.JSONEncoder.default(self, obj)


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def dump_json(obj, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, cls=NumpyEncoder)


def imread(path, flags=cv2.IMREAD_COLOR):
    """cv2.imread, but works with unicode paths"""
    return cv2.imdecode(np.fromfile(path, dtype=np.uint8), flags)

def get_supported_file_types():
    return ['.cbz']

def path_is_supported_input(path):
    path_ext = path.suffix.lower()
    return path.is_dir() or path_ext in get_supported_file_types()

def unzip_if_zipped(path):
    if path.suffix.lower() == '.cbz':
        return unzip_cbz(path)
    return path

def unzip_cbz(zip_path):
    content_path = zip_path.parent / zip_path.stem
    # atexit.register(shutil.rmtree, content_path)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(content_path)
    return content_path