from pathlib import Path

import fire
from loguru import logger

from mokuro import OverlayGenerator


def run(*paths,
        parent_dir=None,
        pretrained_model_name_or_path='kha-white/manga-ocr-base',
        force_cpu=False,
        as_one_file=True,
        disable_confirmation=False,
        ):
    paths = [Path(p).expanduser().absolute() for p in paths]

    if parent_dir is not None:
        for p in Path(parent_dir).expanduser().absolute().iterdir():
            if p.is_dir() and p.stem != '_ocr' and p not in paths:
                paths.append(p)

    print(f'\nPaths to process (each path will be treated as one volume):')
    for p in paths:
        print(p)

    if not disable_confirmation:
        inp = input('Continue? [yes/no]\n')
        if inp.lower() not in ('y', 'yes'):
            return

    ovg = OverlayGenerator(pretrained_model_name_or_path=pretrained_model_name_or_path, force_cpu=force_cpu)

    num_sucessful = 0
    for i, path in enumerate(paths):
        logger.info(f'Processing {i + 1}/{len(paths)}: {path}')
        try:
            ovg.process_dir(path, as_one_file=as_one_file)
        except Exception:
            logger.exception(f'Error while processing {path}')
        else:
            num_sucessful += 1

    logger.info(f'Processed succesfully: {num_sucessful}/{len(paths)}')


if __name__ == '__main__':
    fire.Fire(run)
