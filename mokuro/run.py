from pathlib import Path

import fire
from loguru import logger
from natsort import natsorted

from mokuro import OverlayGenerator


def run(*paths,
        parent_dir=None,
        pretrained_model_name_or_path='kha-white/manga-ocr-base',
        force_cpu=False,
        as_one_file=True,
        disable_confirmation=False,
        disable_ocr=False,
        ):
    
    if disable_ocr:
        logger.info('Running with OCR disabled')

    paths = [Path(p).expanduser().absolute() for p in paths]

    if parent_dir is not None:
        for p in Path(parent_dir).expanduser().absolute().iterdir():
            if p.is_dir() and p.stem != '_ocr' and p not in paths:
                paths.append(p)

    if len(paths) == 0:
        logger.error('Found no paths to process. Did you set the paths correctly?')
        return

    paths = natsorted(paths)

    print(f'\nPaths to process:\n')
    for p in paths:
        print(p)

    if not disable_confirmation:
        inp = input('\nEach of the paths above will be treated as one volume. Continue? [yes/no]\n')
        if inp.lower() not in ('y', 'yes'):
            return

    ovg = OverlayGenerator(pretrained_model_name_or_path=pretrained_model_name_or_path, force_cpu=force_cpu, disable_ocr=disable_ocr)

    num_sucessful = 0
    for i, path in enumerate(paths):
        logger.info(f'Processing {i + 1}/{len(paths)}: {path}')
        try:
            ovg.process_dir(path, as_one_file=as_one_file)
        except Exception:
            logger.exception(f'Error while processing {path}')
        else:
            num_sucessful += 1

    logger.info(f'Processed successfully: {num_sucessful}/{len(paths)}')


if __name__ == '__main__':
    fire.Fire(run)
