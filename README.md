# Manga OCR overlay

Read Japanese manga inside browser with selectable text.

See demo: https://kha-white.github.io/manga-demo

# Usage

Clone the repo and install dependencies:

```bash
git clone --recurse-submodules https://github.com/kha-white/mokuro.git
pip3 install -r mokuro/comic_text_detector/requirements.txt
pip3 install -r mokuro/requirements.txt
```

Generate HTML overlay:

```python
from mokuro import OverlayGenerator

ovg = OverlayGenerator()
ovg.process_dir('/path/to/manga/vol1')
```

This will create `/path/to/manga/vol1.html` file, which you can open in browser.

# Contact
For any inquiries, please feel free to contact me at kha-white@mail.com

# Acknowledgments

- https://github.com/dmMaze/comic-text-detector
- https://github.com/juvian/Manga-Text-Segmentation
