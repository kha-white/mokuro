from pathlib import Path

ASSETS_PATH = Path(__file__).parent / "assets"

assert ASSETS_PATH.is_dir(), f"{ASSETS_PATH} missing"
