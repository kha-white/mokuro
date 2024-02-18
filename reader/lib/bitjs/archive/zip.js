/**
 * zip.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 *
 * Reference Documentation:
 *
 * ZIP format: http://www.pkware.com/documents/casestudies/APPNOTE.TXT
 * DEFLATE format: http://tools.ietf.org/html/rfc1951
 */

// This file expects to be invoked as a Worker (see onmessage below).
importScripts('../io/bitstream-worker.js');
importScripts('../io/bytebuffer-worker.js');
importScripts('../io/bytestream-worker.js');

/**
 * The client sends messages to this Worker containing files to archive in order. The client
 * indicates to the Worker when the last file has been sent to be compressed.
 *
 * The Worker emits an event to indicate compression has started: { type: 'start' }
 * As the files compress, bytes are sent back in order: { type: 'compress', bytes: Uint8Array }
 * After the last file compresses, the Worker indicates finish by: { type 'finish' }
 *
 * Clients should append the bytes to a single buffer in the order they were received.
 */

/**
 * @typedef FileInfo An object that is sent to this worker by the client to represent a file.
 * @property {string} fileName The name of this file. TODO: Includes the path?
 * @property {number} lastModTime The number of ms since the Unix epoch (1970-01-01 at midnight).
 * @property {Uint8Array} fileData The raw bytes of the file.
 */

// TODO: Support DEFLATE.
// TODO: Support options that can let client choose levels of compression/performance.

/**
 * Ideally these constants should be defined in a common isomorphic ES module. Unfortunately, the
 * state of JavaScript is such that modules cannot be shared easily across browsers, worker threads,
 * NodeJS environments, etc yet. Thus, these constants, as well as logic that should be extracted to
 * common modules and shared with unzip.js are not yet easily possible.
 */

const zLocalFileHeaderSignature = 0x04034b50;
const zCentralFileHeaderSignature = 0x02014b50;
const zEndOfCentralDirSignature = 0x06054b50;
const zCRC32MagicNumber = 0xedb88320; // 0xdebb20e3;

/**
 * @typedef CentralDirectoryFileHeaderInfo An object to be used to construct the central directory.
 * @property {string} fileName
 * @property {number} compressionMethod (2 bytes)
 * @property {number} lastModFileTime (2 bytes)
 * @property {number} lastModFileDate (2 bytes)
 * @property {number} crc32 (4 bytes)
 * @property {number} compressedSize (4 bytes)
 * @property {number} uncompressedSize (4 bytes)
 * @property {number} byteOffset (4 bytes)
 */

/** @type {FileInfo[]} */
let filesCompressed = [];

/** @type {CentralDirectoryFileHeaderInfo[]} */
let centralDirectoryInfos = [];

/** @type {number} */
let numBytesWritten = 0;

const CompressorState = {
  NOT_STARTED: 0,
  COMPRESSING: 1,
  WAITING: 2,
  FINISHED: 3,
};
let state = CompressorState.NOT_STARTED;
let lastFileReceived = false;
const crc32Table = createCRC32Table();

/** Helper functions. */

/**
 * Logic taken from https://github.com/nodeca/pako/blob/master/lib/zlib/crc32.js
 * @returns {Uint8Array}
 */
function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (zCRC32MagicNumber ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
};

/**
 * Logic taken from https://github.com/nodeca/pako/blob/master/lib/zlib/crc32.js
 * @param {number} crc
 * @param {Uint8Array} bytes
 * @returns {number}
 */
function calculateCRC32(crc, bytes) {
  const len = bytes.byteLength;
  crc ^= -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xFF];
  }
  crc ^= -1;
  if (crc < 0) {
    crc += 0x100000000;
  }
  return crc;
}

/**
 * Logic taken from https://github.com/thejoshwolfe/yazl.
 * @param {number} lastModTime The number of ms since the Unix epoch (1970-01-01 at midnight).
 * @returns {number}
 */
function dateToDosDate(jsDate) {
  let date = 0;
  date |= jsDate.getDate() & 0x1f; // 1-31
  date |= ((jsDate.getMonth() + 1) & 0xf) << 5; // 0-11, 1-12
  date |= ((jsDate.getFullYear() - 1980) & 0x7f) << 9; // 0-128, 1980-2108
  return date;
}

/**
 * Logic taken from https://github.com/thejoshwolfe/yazl.
 * @param {number} lastModTime The number of ms since the Unix epoch (1970-01-01 at midnight).
 * @returns {number}
 */
function dateToDosTime(jsDate) {
  let time = 0;
  time |= Math.floor(jsDate.getSeconds() / 2); // 0-59, 0-29 (lose odd numbers)
  time |= (jsDate.getMinutes() & 0x3f) << 5; // 0-59
  time |= (jsDate.getHours() & 0x1f) << 11; // 0-23
  return time;
}

/**
 * @param {FileInfo} file
 * @returns {bitjs.io.ByteBuffer}
 */
function zipOneFile(file) {
  // Zip Local File Header has 30 bytes and then the filename and extrafields.
  const fileHeaderSize = 30 + file.fileName.length;

  /** @type {bitjs.io.ByteBuffer} */
  const buffer = new bitjs.io.ByteBuffer(fileHeaderSize + file.fileData.length);

  buffer.writeNumber(zLocalFileHeaderSignature, 4); // Magic number.
  buffer.writeNumber(0x0A, 2); // Version.
  buffer.writeNumber(0, 2); // General Purpose Flags.
  buffer.writeNumber(0, 2); // Compression Method. 0 = Store only.

  const jsDate = new Date(file.lastModTime);

  /** @type {CentralDirectoryFileHeaderInfo} */
  const centralDirectoryInfo = {
    compressionMethod: 0,
    lastModFileTime: dateToDosTime(jsDate),
    lastModFileDate: dateToDosDate(jsDate),
    crc32: calculateCRC32(0, file.fileData),
    // TODO: For now, this is easy. Later when we do DEFLATE, we will have to calculate.
    compressedSize: file.fileData.byteLength,
    uncompressedSize: file.fileData.byteLength,
    fileName: file.fileName,
    byteOffset: numBytesWritten,
  };
  centralDirectoryInfos.push(centralDirectoryInfo);

  buffer.writeNumber(centralDirectoryInfo.lastModFileTime, 2); // Last Mod File Time.
  buffer.writeNumber(centralDirectoryInfo.lastModFileDate, 2); // Last Mod Date.
  buffer.writeNumber(centralDirectoryInfo.crc32, 4); // crc32.
  buffer.writeNumber(centralDirectoryInfo.compressedSize, 4); // Compressed size.
  buffer.writeNumber(centralDirectoryInfo.uncompressedSize, 4); // Uncompressed size.
  buffer.writeNumber(centralDirectoryInfo.fileName.length, 2); // Filename length.
  buffer.writeNumber(0, 2); // Extra field length.
  buffer.writeASCIIString(centralDirectoryInfo.fileName); // Filename. Assumes ASCII.
  buffer.insertBytes(file.fileData); // File data.

  return buffer;
}

/**
 * @returns {bitjs.io.ByteBuffer}
 */
function writeCentralFileDirectory() {
  // Each central directory file header is 46 bytes + the filename.
  let cdsLength = filesCompressed.map(f => f.fileName.length + 46).reduce((a, c) => a + c);
  // 22 extra bytes for the end-of-central-dir header.
  const buffer = new bitjs.io.ByteBuffer(cdsLength + 22);

  for (const cdInfo of centralDirectoryInfos) {
    buffer.writeNumber(zCentralFileHeaderSignature, 4); // Magic number.
    buffer.writeNumber(0, 2); // Version made by. // 0x31e
    buffer.writeNumber(0, 2); // Version needed to extract (minimum). // 0x14
    buffer.writeNumber(0, 2); // General purpose bit flag
    buffer.writeNumber(0, 2); // Compression method.
    buffer.writeNumber(cdInfo.lastModFileTime, 2); // Last Mod File Time.
    buffer.writeNumber(cdInfo.lastModFileDate, 2); // Last Mod Date.
    buffer.writeNumber(cdInfo.crc32, 4); // crc32.
    buffer.writeNumber(cdInfo.compressedSize, 4); // Compressed size.
    buffer.writeNumber(cdInfo.uncompressedSize, 4); // Uncompressed size.
    buffer.writeNumber(cdInfo.fileName.length, 2); // File name length.
    buffer.writeNumber(0, 2); // Extra field length.
    buffer.writeNumber(0, 2); // Comment length.
    buffer.writeNumber(0, 2); // Disk number where file starts.
    buffer.writeNumber(0, 2); // Internal file attributes.
    buffer.writeNumber(0, 4); // External file attributes.
    buffer.writeNumber(cdInfo.byteOffset, 4); // Relative offset of local file header.
    buffer.writeASCIIString(cdInfo.fileName); // File name.
  }

  // 22 more bytes.
  buffer.writeNumber(zEndOfCentralDirSignature, 4); // Magic number.
  buffer.writeNumber(0, 2); // Number of this disk.
  buffer.writeNumber(0, 2); // Disk where central directory starts.
  buffer.writeNumber(filesCompressed.length, 2); // Number of central directory records on this disk.
  buffer.writeNumber(filesCompressed.length, 2); // Total number of central directory records.
  buffer.writeNumber(cdsLength, 4); // Size of central directory.
  buffer.writeNumber(numBytesWritten, 4); // Offset of start of central directory.
  buffer.writeNumber(0, 2); // Comment length.

  return buffer;
}

/**
 * @param {{data: {isLastFile?: boolean, files: FileInfo[]}}} evt The event for the Worker
 *     to process. It is an error to send any more events to the Worker if a previous event had
 *     isLastFile is set to true.
 */
onmessage = function(evt) {
  if (state === CompressorState.FINISHED) {
    throw `The zip worker was sent a message after last file received.`;
  }

  if (state === CompressorState.NOT_STARTED) {
    postMessage({ type: 'start' });
  }

  state = CompressorState.COMPRESSING;

  /** @type {FileInfo[]} */
  const filesToCompress = evt.data.files;
  while (filesToCompress.length > 0) {
    const fileInfo = filesToCompress.shift();
    const fileBuffer = zipOneFile(fileInfo);
    filesCompressed.push(fileInfo);
    numBytesWritten += fileBuffer.data.byteLength;
    this.postMessage({ type: 'compress', bytes: fileBuffer.data }, [ fileBuffer.data.buffer ]);
  }

  if (evt.data.isLastFile) {
    const centralBuffer = writeCentralFileDirectory();
    numBytesWritten += centralBuffer.data.byteLength;
    this.postMessage({ type: 'compress', bytes: centralBuffer.data }, [ centralBuffer.data.buffer ]);

    state = CompressorState.FINISHED;
    this.postMessage({ type: 'finish' });
  } else {
    state = CompressorState.WAITING;
  }
};
