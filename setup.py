from pathlib import Path

from setuptools import setup, find_packages

long_description = (Path(__file__).parent / "README.md").read_text('utf-8').split('# Installation')[0]

setup(
    name="mokuro",
    version='0.1.8',
    description="Browser reader for manga with selectable text",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/kha-white/mokuro",
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
        "natsort",
        "numpy",
        "opencv-python>=4.1.2",
        "Pillow>=7.1.2",
        "pyclipper",
        "requests",
        "scipy",
        "shapely",
        "torch>=1.7.0",
        "torchsummary",
        "torchvision>=0.8.1",
        "transformers>=4.25.0",
        "tqdm>=4.41.0",
        "yattag",
    ],
    entry_points={
        "console_scripts": [
            "mokuro=mokuro.__main__:main",
        ]
    },
)
