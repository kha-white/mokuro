
import { Zipper, ZipCompressionMethod } from '../archive/compress.js';

const result = document.querySelector('#result');
const fileInputEl = document.querySelector('#zip-tester');
const saveButtonEl = document.querySelector('#save');
let byteArray = null;

/**
 * @typedef FileInfo An object that is sent to this worker to represent a file.
 * @property {string} fileName The name of this file. TODO: Includes the path?
 * @property {number} lastModTime The number of ms since the Unix epoch (1970-01-01 at midnight).
 * @property {Uint8Array} fileData The bytes of the file.
 */

/**
 * @returns {Promise<}
 */
async function getFiles(fileChangeEvt) {
  result.innerHTML = `Starting to load files`;
  const files = fileChangeEvt.target.files;
  const fileInfos = [];
  for (const file of files) {
    fileInfos.push(await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        resolve({
          fileName: file.name,
          lastModTime: file.lastModified,
          fileData: new Uint8Array(fr.result),
        });
      };
      fr.readAsArrayBuffer(file);
    }));
  }

  result.innerHTML = `Loaded files`;

  const zipper = new Zipper({
    pathToBitJS: '../',
    zipCompressionMethod: ZipCompressionMethod.DEFLATE,
  });
  byteArray = await zipper.start(fileInfos, true);
  result.innerHTML = `Zipping done`;
  saveButtonEl.style.display = '';
}

async function saveFile(evt) {
  /** @type {FileSystemFileHandle} */
  const fileHandle = await window['showSaveFilePicker']({
    types: [
      {
        accept: {
          'application/zip': ['.zip', '.cbz'],
        },
      },
    ],
  });

  /** @type {FileSystemWritableFileStream} */
  const writableStream = await fileHandle.createWritable();
  writableStream.write(byteArray);
  writableStream.close();
}

fileInputEl.addEventListener('change', getFiles, false);
saveButtonEl.addEventListener('click', saveFile, false);
