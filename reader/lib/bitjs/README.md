[![Node.js CI](https://github.com/codedread/bitjs/actions/workflows/node.js.yml/badge.svg)](https://github.com/codedread/bitjs/actions/workflows/node.js.yml)

# bitjs: Binary Tools for JavaScript

## Introduction

A set of dependency-free JavaScript modules to handle binary data in JS (using Typed Arrays).  Includes:

  * bitjs/archive: Unarchiving files (unzip, unrar, untar) in the browser, implemented as Web Workers and allowing progressively unarchiving while streaming.
  * bitjs/codecs: Get the codec info of media containers in a ISO RFC6381 MIME type string
  * bitjs/file: Detect the type of file from its binary signature.
  * bitjs/image: Conversion of WebP images to PNG or JPEG.
  * bitjs/io: Low-level classes for interpreting binary data (BitStream, ByteStream).  For example, reading or peeking at N bits at a time.

## Installation

Install it using your favourite package manager, the package is registered under `@codedread/bitjs`. 
```bash
$ npm install @codedread/bitjs
```
or
```bash
$ yarn add @codedread/bitjs
```

## bitjs.archive

This package includes objects for unarchiving binary data in popular archive formats (zip, rar, tar) providing unzip, unrar and untar capabilities via JavaScript in the browser. A prototype version of a compressor that creates Zip files is also present. The decompression/compression actually happens inside a Web Worker.

### Decompressing

```javascript
import { Unzipper } from './bitjs/archive/decompress.js';
const unzipper = new Unzipper(zipFileArrayBuffer);
unzipper.addEventListener('progress', updateProgress);
unzipper.addEventListener('extract', receiveOneFile);
unzipper.addEventListener('finish', displayZipContents);
unzipper.start();

function updateProgress(e) {
  // e.currentFilename is the file currently being unarchived/scanned.
  // e.totalCompressedBytesRead has how many bytes have been unzipped so far
}

function receiveOneFile(e) {
  // e.unarchivedFile.filename: string
  // e.unarchivedFile.fileData: Uint8Array
}

function displayZipContents() {
  // Now sort your received files and show them or whatever...
}
```

The unarchivers also support progressively decoding while streaming the file, if you are receiving the zipped file from a slow place (a Cloud API, for instance).  For example:

```javascript
import { Unzipper } from './bitjs/archive/decompress.js';
const unzipper = new Unzipper(anArrayBufferWithStartingBytes);
unzipper.addEventListener('progress', updateProgress);
unzipper.addEventListener('extract', receiveOneFile);
unzipper.addEventListener('finish', displayZipContents);
unzipper.start();
...
// after some time
unzipper.update(anArrayBufferWithMoreBytes);
...
// after some more time
unzipper.update(anArrayBufferWithYetMoreBytes);
```

### Compressing

The Zipper only supports creating zip files without compression (story only) for now. The interface
is pretty straightforward and there is no event-based / streaming API.

```javascript
import { Zipper } from './bitjs/archive/compress.js';
const zipper = new Zipper();
const now = Date.now();
// Zip files foo.jpg and bar.txt.
const zippedArrayBuffer = await zipper.start(
  [
    {
      fileName: 'foo.jpg',
      lastModTime: now,
      fileData: fooArrayBuffer,
    },
    {
      fileName: 'bar.txt',
      lastModTime: now,
      fileData: barArrayBuffer,
    }
  ],
  true /* isLastFile */);
```

## bitjs.codecs

This package includes code for dealing with media files (audio/video). It is useful for deriving
ISO RFC6381 MIME type strings, including the codec information. Currently supports a limited subset
of MP4 and WEBM.

How to use:
  * First, install ffprobe (ffmpeg) on your system.
  * Then:
```javascript

import { getFullMIMEString } from 'bitjs/codecs/codecs.js';
/**
 * @typedef {import('bitjs/codecs/codecs.js').ProbeInfo} ProbeInfo
 */

const cmd = 'ffprobe -show_format -show_streams -print_format json -v quiet foo.mp4';
exec(cmd, (error, stdout) => {
  /** @type {ProbeInfo} */
  const info = JSON.parse(stdout);
  // 'video/mp4; codecs="avc1.4D4028, mp4a.40.2"'
  const contentType = getFullMIMEString(info);
  ...
});
```

## bitjs.file

This package includes code for dealing with files.  It includes a sniffer which detects the type of file, given an ArrayBuffer.

```javascript
import { findMimeType } from './bitjs/file/sniffer.js';
const mimeType = findMimeType(someArrayBuffer);
```

## bitjs.image

This package includes code for dealing with binary images.  It includes a module for converting WebP images into alternative raster graphics formats (PNG/JPG).

```javascript
import { convertWebPtoPNG, convertWebPtoJPG } from './bitjs/image/webp-shim/webp-shim.js';
// convertWebPtoPNG() takes in an ArrayBuffer containing the bytes of a WebP
// image and returns a Promise that resolves with an ArrayBuffer containing the
// bytes of an equivalent PNG image.
convertWebPtoPNG(webpBuffer).then(pngBuf => {
  const pngUrl = URL.createObjectURL(new Blob([pngBuf], {type: 'image/png'}));
  someImgElement.setAttribute(src, pngUrl);
});
```

## bitjs.io

This package includes stream objects for reading and writing binary data at the bit and byte level: BitStream, ByteStream.

```javascript
import { BitStream } from './bitjs/io/bitstream.js';
const bstream = new BitStream(someArrayBuffer, true, offset, length);
const crc = bstream.readBits(12); // read in 12 bits as CRC, advancing the pointer
const flagbits = bstream.peekBits(6); // look ahead at next 6 bits, but do not advance the pointer
```

# Other Tests

Those that haven't been ported to mocha/chai/nodejs.

* [bitjs.archive tests](https://codedread.github.io/bitjs/tests/archive-test.html)

## Reference

* [UnRar](http://codedread.github.io/bitjs/docs/unrar.html): A work-in-progress description of the RAR file format.

## History

This project grew out of another project of mine, [kthoom](https://github.com/codedread/kthoom) (a comic book reader implemented in the browser).  This repository was automatically exported from [my original repository on GoogleCode](https://code.google.com/p/bitjs) and has undergone considerable changes and improvements since then, including adding streaming support, starter RarVM support, tests, many bug fixes, and updating the code to ES6.
