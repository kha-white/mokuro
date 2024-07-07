import uuid
from enum import Enum, auto

from loguru import logger
from natsort import natsorted

from mokuro.utils import get_path_format, load_json, dump_json, unzip


class VolumeStatus(Enum):
    UNPROCESSED = auto()
    PARTIALLY_PROCESSED = auto()
    PROCESSED = auto()

    def __str__(self):
        return {
            "UNPROCESSED": "unprocessed",
            "PARTIALLY_PROCESSED": "partially processed",
            "PROCESSED": "already processed",
        }[self.name]


class Title:
    def __init__(self, path):
        self.path = path
        self._uuid = None
        self.name = path.name

    @property
    def uuid(self):
        if self._uuid is None:
            self.set_uuid()

        return self._uuid

    def set_uuid(self, update_existing=True):
        existing_title_uuids = set()

        for path_mokuro in self.path.glob("*.mokuro"):
            mokuro_data = load_json(path_mokuro)

            title_uuid = mokuro_data.get("title_uuid")
            if title_uuid is not None:
                existing_title_uuids.add(title_uuid)

        if len(existing_title_uuids) == 0:
            self._uuid = str(uuid.uuid4())
        elif len(existing_title_uuids) == 1:
            self._uuid = existing_title_uuids.pop()
        else:
            logger.warning("Incosistent title uuids; generating a new one")
            self._uuid = str(uuid.uuid4())

        if update_existing:
            for path_mokuro in self.path.glob("*.mokuro"):
                mokuro_data = load_json(path_mokuro)

                if mokuro_data.get("title_uuid") != self._uuid:
                    mokuro_data["title_uuid"] = self._uuid
                    dump_json(mokuro_data, path_mokuro)


class Volume:
    format_preference_order = ["", ".cbz", ".zip"]

    def __init__(self, path_in):
        self.paths_in = {path_in}
        self.path_mokuro = get_path_mokuro(path_in)

        if self.path_mokuro.is_file():
            self.mokuro_data = load_json(self.path_mokuro)
            self.uuid = self.mokuro_data.get("volume_uuid")
        else:
            self.mokuro_data = None
            self.uuid = str(uuid.uuid4())

        self.title = None
        self.name = self.path_mokuro.stem

        if self.path_mokuro.is_file():
            self.status = VolumeStatus.PROCESSED
        elif self.path_ocr_cache.is_dir():
            self.status = VolumeStatus.PARTIALLY_PROCESSED
        else:
            self.status = VolumeStatus.UNPROCESSED

    @property
    def path_in(self):
        return min(self.paths_in, key=lambda path: Volume.format_preference_order.index(get_path_format(path)))

    @property
    def path_ocr_cache(self):
        return self.path_mokuro.parent / "_ocr" / self.path_mokuro.stem

    @property
    def path_title(self):
        return self.path_mokuro.parent

    def get_json_paths(self):
        json_paths = natsorted(p.relative_to(self.path_ocr_cache) for p in self.path_ocr_cache.glob("**/*.json"))
        json_paths = {p.with_suffix(""): p for p in json_paths}
        return json_paths

    def get_img_paths(self):
        assert self.path_in.is_dir()
        img_paths = natsorted(
            p.relative_to(self.path_in)
            for p in self.path_in.glob("**/*")
            if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
        )
        img_paths = {p.with_suffix(""): p for p in img_paths}
        return img_paths

    def unzip(self, tmp_dir=None):
        if self.path_in.is_file() and self.path_in.suffix.lower() in {".zip", ".cbz"}:
            if tmp_dir is None:
                path_dst = self.path_in.with_suffix("")
            else:
                path_dst = tmp_dir / self.uuid

            logger.info(f"Unzipping {self.path_in}")
            unzip(self.path_in, path_dst, correct_duplicated_root=True)

            self.paths_in.add(path_dst)

    def __str__(self):
        return f"{self.path_in} ({self.status})"


class VolumeCollection:
    def __init__(self):
        self.volumes = {}
        self.titles = {}

    def __len__(self):
        return len(self.volumes)

    def __iter__(self):
        return iter(natsorted(self.volumes.values(), key=lambda vtp: vtp.path_in))

    def add_path_in(self, path_in):
        path_mokuro = get_path_mokuro(path_in)
        if path_mokuro in self.volumes:
            volume = self.volumes[path_mokuro]
            volume.paths_in.add(path_in)
        else:
            volume = self.volumes[path_mokuro] = Volume(path_in)

        if volume.path_title in self.titles:
            title = self.titles[volume.path_title]
        else:
            title = self.titles[volume.path_title] = Title(volume.path_title)

        volume.title = title


def get_path_mokuro(path_in):
    if path_in.is_dir():
        return path_in.parent / (path_in.name + ".mokuro")
    if path_in.is_file() and path_in.suffix.lower() in {".zip", ".cbz"}:
        return path_in.with_suffix(".mokuro")
