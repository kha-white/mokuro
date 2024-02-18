/*
 * archive-test.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 */

import { ByteBuffer } from '../io/bytebuffer.js';
import { ByteStream } from '../io/bytestream.js';
import 'mocha';
import { expect } from 'chai';

// TODO: Only test ByteBuffer here.
describe('bitjs.io.ByteBuffer', () => {
  let buffer;

  beforeEach(() => {
    buffer = new ByteBuffer(4);
  });

  it('Write_SingleByte', () => {
    buffer.writeNumber(192, 1);
    expect(buffer.ptr).equals(1);
  });

  it('Write_SingleByteNegativeNumber', () => {
    buffer.writeSignedNumber(-120, 1);
    expect(buffer.ptr).equals(1);
  });

  it('Write_MultiByteNumber', () => {
    buffer.writeNumber(1234, 4);
    const stream = new ByteStream(buffer.data.buffer);
    expect(buffer.ptr).equals(4);
  });

  it('Write_MultiByteNegativeNumber', () => {
    buffer.writeSignedNumber(-1234, 4);
    expect(buffer.ptr).equals(4);
  });

  it('WriteOverflowUnsigned', () => {
    expect(() => buffer.writeNumber(256, 1)).throws();
  });

  it('WriteOverflowSignedPositive', () => {
    expect(() => buffer.writeSignedNumber(128, 1)).throws();
  });

  it('WriteOverflowSignedNegative', () => {
    expect(() => buffer.writeSignedNumber(-129, 1)).throws();
  });
});