from loguru import logger
from tqdm import tqdm

from mokuro import __version__
from mokuro.manga_page_ocr import MangaPageOcr
from mokuro.utils import dump_json, load_json
from mokuro.volume import Volume


class MokuroGenerator:
    def __init__(self,
                 pretrained_model_name_or_path='kha-white/manga-ocr-base',
                 force_cpu=False,
                 **kwargs):
        self.pretrained_model_name_or_path = pretrained_model_name_or_path
        self.force_cpu = force_cpu
        self.kwargs = kwargs
        self.mpocr = None

    def init_models(self):
        if self.mpocr is None:
            self.mpocr = MangaPageOcr(self.pretrained_model_name_or_path, self.force_cpu, **self.kwargs)

    def process_volume(self, volume: Volume, ignore_errors=False, no_cache=False):
        volume.path_ocr_cache.mkdir(parents=True, exist_ok=True)

        img_paths = volume.get_img_paths()

        for img_path_rel in tqdm(img_paths.values(), desc='Processing pages...'):
            try:
                json_path = (volume.path_ocr_cache / img_path_rel).with_suffix('.json')
                if no_cache or not json_path.is_file():
                    self.init_models()
                    result = self.mpocr(volume.path_in / img_path_rel)
                    json_path.parent.mkdir(parents=True, exist_ok=True)
                    dump_json(result, json_path)
            except Exception as e:
                if ignore_errors:
                    logger.error(e)
                else:
                    raise e

        self.generate_mokuro_file(volume, ignore_errors=ignore_errors)

    @staticmethod
    def generate_mokuro_file(volume: Volume, ignore_errors=False):
        json_paths = volume.get_json_paths()
        img_paths = volume.get_img_paths()

        out = {
            'version': __version__,
            'title': volume.title.name,
            'title_uuid': volume.title.uuid,
            'volume': volume.name,
            'volume_uuid': volume.uuid,
            'pages': []
        }

        for key, json_path_rel in json_paths.items():
            try:
                img_path_rel = img_paths[key]
                page_json = load_json(volume.path_ocr_cache / json_path_rel)
                page_json['img_path'] = str(img_path_rel).replace('\\', '/')
                out['pages'].append(page_json)
            except Exception as e:
                if ignore_errors:
                    logger.error(e)
                else:
                    raise e

        dump_json(out, volume.path_mokuro)
