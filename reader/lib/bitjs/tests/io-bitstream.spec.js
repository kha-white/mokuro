/*
 * archive-test.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 */

import { BitStream } from '../io/bitstream.js';
import 'mocha';
import { expect } from 'chai';

describe('bitjs.io.BitStream', () => {
  let array;
  beforeEach(() => {
    array = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) {
      array[i] = Number('0b01100101');
    }
  });

  it('BitPeekAndRead_RTL', () => {
    const stream = new BitStream(array.buffer, true /* rtl */);
    // 0110 = 2 + 4 = 6
    expect(stream.readBits(4)).equals(6);
    // 0101 011 = 1 + 2 + 8 + 32 = 43
    expect(stream.readBits(7)).equals(43);
    // 00101 01100101 01 = 1 + 4 + 16 + 128 + 256 + 1024 + 4096 = 5525
    expect(stream.readBits(15)).equals(5525);
    // 10010 = 2 + 16 = 18
    expect(stream.readBits(5)).equals(18);

    // Ensure the last bit is read, even if we flow past the end of the stream.
    expect(stream.readBits(2)).equals(1);
  });

  it('BitPeekAndRead_LTR', () => {
    const stream = new BitStream(array.buffer, false /* rtl */);

    // 0101 = 2 + 4 = 6
    expect(stream.peekBits(4)).equals(5);
    expect(stream.readBits(4)).equals(5);
    // 101 0110 = 2 + 4 + 16 + 64 = 86
    expect(stream.readBits(7)).equals(86);
    // 01 01100101 01100 = 4 + 8 + 32 + 128 + 1024 + 2048 + 8192 = 11436
    expect(stream.readBits(15)).equals(11436);
    // 11001 = 1 + 8 + 16 = 25
    expect(stream.readBits(5)).equals(25);

    // Only 1 bit left in the buffer, make sure it reads in, even if we over-read.
    expect(stream.readBits(2)).equals(0);
  });

  it('BitStreamReadBytes', () => {
    array[1] = Number('0b01010110');
    const stream = new BitStream(array.buffer);

    let twoBytes = stream.peekBytes(2);
    expect(twoBytes instanceof Uint8Array).true;
    expect(twoBytes.byteLength).equals(2);
    expect(twoBytes[0]).equals(Number('0b01100101'));
    expect(twoBytes[1]).equals(Number('0b01010110'));

    twoBytes = stream.readBytes(2);
    expect(twoBytes instanceof Uint8Array).true;
    expect(twoBytes.byteLength).equals(2);
    expect(twoBytes[0]).equals(Number('0b01100101'));
    expect(twoBytes[1]).equals(Number('0b01010110'));

    expect(() => stream.readBytes(3)).throws();
  });
});
