> This is a fork of [mokuro](https://github.com/kha-white/mokuro) that adds various improvements and featurs to the manga viewer.

# Additions:

## Anki connect integration:

The reader now has an `Advanced settings` modal where you can specify various new settings, including enabling anki connect integration.

When anki connect integration is enabled, it will allow you to instantly add the image and sentence to your last created card. You can configure whether or not to crop the image before adding it to the card as well as various other settings

https://github.com/ZXY101/mokuro/assets/39561296/ade9e655-dcb9-4e99-9244-5df5971cc26b

## Settings importing/exporting:

You can now export your mokuro settings as a `.json` file and import them from any mokuro'd file (that was processed with this fork) to instantly carry your settings over.

This is especially handy so that you do not need to reconfigure your anki connect settings every time you start a new manga.

## Image preloading:

When reading from a server mokuro used to only fetch the image as you navigate to it, this would cause momentary flashes of nothing that would dampen the reading experience.

You can now specify how many pages you would like to preload ahead (up to 10), allowing you to read from a server without worrying about waiting for the page to load.

## `mobile` flag (Default: True):

If true, mokuro will generate additional files that are optimised to be viewed on mobile devices, the default files will still be generated.

In the mobile files:

- panzoom has been stripped out to allow the default pan/zoom behavior
- panning & zooming is limited to the page size, you can't fly off into the void
- you can now swipe to navigate (can adjust swipe threshold)
- easier to access navigation buttons have been added (can be hidden)
- easier to see page count has been added (can be hidden)

### usage:

```bash
$> mokuro my-manga-1 --mobile True --disable_confirmation True
// _ocr, my-manga-1.html, my-manga-1.mobile.html
```

`my-manga-1.html` being exactly the same as normal and `my-manga-1.mobile.html` being the mobile friendly version.

## Misc:

- You can now set the background color.
- You can now toggle bold font.
- Add new "on page turn" zoom mode (Keep zoom level but scroll to the top)
- Easier navigation for normal files (Clicking to the sides of the page will now navigate)

# Installation

```bash
$> pip install git+https://github.com/ZXY101/mokuro.git@master
```

(You may need to uninstall mokuro first)

Or use in [Google colab](https://colab.research.google.com/drive/1i2ESDMmqwjpnOQQZx3vKP8Pd8R_Gtz4W?usp=sharing)

---

### In use with [jidoujisho](https://github.com/lrorpilla/jidoujisho)

https://user-images.githubusercontent.com/39561296/234891290-dcd79ce3-e215-4c3d-8f74-98c27917ac7f.mp4

---

# mokuro

Read Japanese manga with selectable text inside a browser.

**See demo: https://kha-white.github.io/manga-demo**

https://user-images.githubusercontent.com/22717958/164993274-3e8d1650-9be3-457d-84cb-f92f9598cd5a.mp4

<sup>Demo contains excerpt from [Manga109-s dataset](http://www.manga109.org/en/download_s.html). うちの猫’ず日記 © がぁさん</sup>

mokuro is aimed towards Japanese learners, who want to read manga in Japanese with a pop-up dictionary like [Yomichan](https://github.com/FooSoft/yomichan).
It works like this:

1. Perform text detection and OCR for each page.
2. After processing a whole volume, generate a HTML file, which you can open in a browser.
3. All processing is done offline (before reading). You can transfer the resulting HTML file together with manga images to
   another device (e.g. your mobile phone) and read there.

mokuro uses [comic-text-detector](https://github.com/dmMaze/comic-text-detector) for text detection
and [manga-ocr](https://github.com/kha-white/manga-ocr) for OCR.

Try running on your manga in Colab: [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/kha-white/mokuro/blob/master/notebooks/mokuro_demo.ipynb)

See also:

- [Mokuro2Pdf](https://github.com/Kartoffel0/Mokuro2Pdf), cli Ruby script to generate pdf files with selectable text from Mokuro's html overlay
- [Xelieu's guide](https://rentry.co/lazyXel), a comprehensive guide on setting up a reading and mining workflow with manga-ocr/mokuro (and many other useful tips)

# Installation

You need Python 3.6, 3.7, 3.8, 3.9, or 3.10. As of April 2023, PyTorch unfortunately does not support Python 3.11 yet, see pytorch/pytorch#86566.

Some users have reported problems with Python installed from Microsoft Store. If you see an error:
`ImportError: DLL load failed while importing fugashi: The specified module could not be found.`,
try installing Python from the [official site](https://www.python.org/downloads).

If you want to run with GPU, install PyTorch as described [here](https://pytorch.org/get-started/locally/#start-locally),
otherwise this step can be skipped.

Run in command line:

```commandline
pip3 install mokuro
```

# Usage

## Run on one volume

```bash
mokuro /path/to/manga/vol1
```

This will generate `/path/to/manga/vol1.html` file, which you can open in a browser.

If your path contains spaces, enclose it in double quotes, like this:

```bash
mokuro "/path/to/manga/volume 1"
```

## Run on multiple volumes

```bash
mokuro /path/to/manga/vol1 /path/to/manga/vol2 /path/to/manga/vol3
```

For each volume, a separate HTML file will be generated.

## Run on a directory containing multiple volumes

If your directory structure looks somewhat like this:

```
manga_title/
├─vol1/
├─vol2/
├─vol3/
└─vol4/
```

You can process all volumes by running:

```bash
mokuro --parent_dir manga_title/
```

## Other options

```
--force_cpu - disable GPU
--as_one_file - generate separate css and js files instead of embedding everything in html
--disable_confirmation - run without asking for confirmation
--mobile - also generate a mobile optimised html file
```

# Contact

For any inquiries, please feel free to contact me at kha-white@mail.com

# Acknowledgments

- https://github.com/dmMaze/comic-text-detector
- https://github.com/juvian/Manga-Text-Segmentation
