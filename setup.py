from pathlib import Path

from setuptools import setup, find_packages

long_description = (Path(__file__).parent / "README.md").read_text('utf-8').split('# Usage')[0]

setup(
    name="manga-ocr-overlay",
    version='0.1.0',
    description="Browser reader for manga with selectable text",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/kha-white/manga-ocr-overlay",
    author="Maciej Budyś",
    author_email="kha-white@mail.com",
    license="GPLv3",
    classifiers=[
        "Programming Language :: Python :: 3",
    ],
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "fire",
        "loguru",
        "manga-ocr>=0.1.7",
        "numpy",
        "onnx>=1.9.0",
        "onnx-simplifier>=0.3.6",
        "opencv-python>=4.1.2",
        "Pillow>=7.1.2",
        "pyclipper",
        "requests",
        "scipy",
        "shapely",
        "torch>=1.7.0",
        "torchsummary",
        "torchvision>=0.8.1",
        "tqdm>=4.41.0",
        "yattag",
    ],
    entry_points={
        "console_scripts": [
            "manga_ocr_overlay=manga_ocr_overlay.__main__:main",
        ]
    },
)
