
import { UnarchiveEventType, Unzipper } from '../archive/archive.js';

const result = document.querySelector('#result');
const fileInputEl = document.querySelector('#unzip-tester');

async function getFiles(fileChangeEvt) {
  result.innerHTML = `Starting to load files`;
  const files = fileChangeEvt.target.files;
  const buffers = [];
  for (const file of files) {
    buffers.push(await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        resolve(new Uint8Array(fr.result));
      };
      fr.readAsArrayBuffer(file);
    }));
  }

  result.innerHTML = `Loaded files`;

  let fileNum = 0;
  const INC = 100 / files.length;
  const start = performance.now();

  for (const b of buffers) {
    await new Promise((resolve, reject) => {
      const unzipper = new Unzipper(b.buffer, { pathToBitJS: '../' });
      unzipper.addEventListener(UnarchiveEventType.FINISH, () => {
        fileNum++;
        resolve();
      });
      result.innerHTML = `Unzipping file ${fileNum} / ${files.length}`;
      unzipper.start();
    });
  }

  const end = performance.now();
  result.innerHTML = `Unzipping took ${end - start}ms`;
}

fileInputEl.addEventListener('change', getFiles, false);

