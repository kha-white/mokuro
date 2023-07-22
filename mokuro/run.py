from collections import Counter
from pathlib import Path
from tempfile import TemporaryDirectory

import fire
from loguru import logger

from mokuro import MokuroGenerator
from mokuro.legacy.overlay_generator import generate_legacy_html
from mokuro.volume import VolumeCollection


def run(*paths,
        parent_dir=None,
        pretrained_model_name_or_path='kha-white/manga-ocr-base',
        force_cpu=False,
        disable_confirmation=False,
        ignore_errors=False,
        no_cache=False,
        unzip=False,
        legacy_html=True,
        as_one_file=True,
        ):
    if legacy_html:
        logger.warning(
            'Legacy HTML output is deprecated and will not be further developed.'
            'Use .mokuro format and web reader instead.')
        # legacy HTML works only with unzipped output
        unzip = True

    logger.info('Scanning paths...')

    paths = [Path(p).expanduser().absolute() for p in paths]

    if parent_dir is not None:
        for p in Path(parent_dir).expanduser().absolute().iterdir():
            if (p not in paths and
                    (p.is_dir() and p.stem != '_ocr') or
                    (p.is_file() and p.suffix.lower() in {'.zip', '.cbz'})
            ):
                paths.append(p)

    vc = VolumeCollection()

    for path_in in paths:
        vc.add_path_in(path_in)

    if len(vc) == 0:
        logger.error('Found no paths to process. Did you set the paths correctly?')
        return

    for title in vc.titles.values():
        title.set_uuid()

    status_counter = Counter()

    print(f'\nFound {len(vc)} volumes:\n')

    for volume in vc:
        print(volume)
        status_counter[volume.status] += 1

    msg = '\nEach of the paths above will be treated as one volume.\n'
    print(msg)

    if not disable_confirmation:
        inp = input('\nContinue? [yes/no]')
        if inp.lower() not in ('y', 'yes'):
            return

    mg = MokuroGenerator(pretrained_model_name_or_path=pretrained_model_name_or_path, force_cpu=force_cpu)

    with TemporaryDirectory() as tmp_dir:
        tmp_dir = Path(tmp_dir)

        # unzip == True means that zipped volumes will be unzipped in their original location
        # in that case, we don't use a temporary directory
        if unzip:
            tmp_dir = None

        num_sucessful = 0
        for i, volume in enumerate(vc):
            logger.info(f'Processing {i + 1}/{len(vc)}: {volume.path_in}')

            try:
                volume.unzip(tmp_dir)
                mg.process_volume(volume, ignore_errors=ignore_errors, no_cache=no_cache)
                if legacy_html:
                    generate_legacy_html(volume, as_one_file=as_one_file, ignore_errors=ignore_errors)

            except Exception:
                logger.exception(f'Error while processing {volume.path_in}')
            else:
                num_sucessful += 1

        logger.info(f'Processed successfully: {num_sucessful}/{len(vc)}')


if __name__ == '__main__':
    fire.Fire(run)
