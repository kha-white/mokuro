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

def get_supported_image_types():
    return ('.jpg', '.jpeg', '.png')

def get_supported_file_types():
    return ('.cbz', '.epub')

def path_is_supported_input(path):
    path_ext = path.suffix.lower()
    return path.is_dir() or path_ext in get_supported_file_types()

def unzip_if_zipped(path):
    path_ext = path.suffix.lower()
    if path_ext in get_supported_file_types():
        if path_ext == '.epub':
            return extract_images_from_zip(path, exceptions=('cover',))
        else:
            return extract_images_from_zip(path)
    return path

def extract_images_from_zip(zip_path, exceptions=()):
    img_output_path = zip_path.parent / zip_path.stem
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_file_list = zip_ref.namelist()
        img_exts = get_supported_image_types()
        [zip_ref.extract(zipped_file, img_output_path) for zipped_file in zip_file_list if zipped_file.lower().endswith(img_exts) and not zipped_file.startswith(exceptions)]
    return img_output_path