/*
 * file-sniffer.spec.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 */

import { findMimeType } from '../file/sniffer.js';
import 'mocha';
import { expect } from 'chai';

function sniffTest(mimeType, sig) {
  const array = new Uint8Array(16);
  array.set(sig);
  expect(findMimeType(array.buffer)).equals(mimeType);
}

describe('bitjs.file.sniffer', () => {
  it('BMP', () => { sniffTest('image/bmp', [0x42, 0x4D, 0x46]); });
  it('GIF', () => { sniffTest('image/gif', [0x47, 0x49, 0x46, 0x38, 0x20]); });
  it('JPG', () => { sniffTest('image/jpeg', [0xFF, 0xD8, 0xFF, 0x23]); });
  it('PNG', () => { sniffTest('image/png', [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0xFF]); });
  it('WebP', () => { sniffTest('image/webp', [0x52, 0x49, 0x46, 0x46, 0x01, 0x02, 0x03, 0x04, 0x57, 0x45, 0x42, 0x50, 0x81]); });
  it('ZIP', () => { sniffTest('application/zip', [0x50, 0x4B, 0x03, 0x04, 0x20]); });
  it('ZIP_empty', () => { sniffTest('application/zip', [0x50, 0x4B, 0x05, 0x06, 0x20]); });
  it('ZIP_spanned', () => { sniffTest('application/zip', [0x50, 0x4B, 0x07, 0x08, 0x20]); });
  it('7Z()', () => { sniffTest('application/x-7z-compressed', [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C, 0x2B]); });
  it('RAR()', () => { sniffTest('application/x-rar-compressed', [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x23]); });
  it('BZ2()', () => { sniffTest('application/x-bzip2', [0x42, 0x5A, 0x68, 0x19]); });
  it('PDF()', () => { sniffTest('application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d, 0x55]); });
  it('MP3_1()', () => { sniffTest('audio/mpeg', [0xFF, 0xFB]); });
  it('MP3_2()', () => { sniffTest('audio/mpeg', [0xFF, 0xF3]); });
  it('MP3_3()', () => { sniffTest('audio/mpeg', [0xFF, 0xF2]); });
  it('MP3_4()', () => { sniffTest('audio/mpeg', [0x49, 0x44, 0x33]); });
  it('OGG', () => { sniffTest('application/ogg', [0x4F, 0x67, 0x67, 0x53]); });
  it('TAR_1', () => { sniffTest('application/x-tar', [0x75, 0x73, 0x74, 0x61, 0x72, 0x00, 0x30, 0x30]); });
  it('TAR_2', () => { sniffTest('application/x-tar', [0x75, 0x73, 0x74, 0x61, 0x72, 0x20, 0x20, 0x00]); });
});
