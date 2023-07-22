/*
 * archive-test.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 */

import { ByteStream } from '../io/bytestream.js';
import 'mocha';
import { expect } from 'chai';

describe('bitjs.io.ByteStream', () => {

  let array;
  beforeEach(() => {
    array = new Uint8Array(4);
  });

  it('PeekAndRead_SingleByte', () => {
    array[0] = 192;
    const stream = new ByteStream(array.buffer);
    expect(stream.peekNumber(1)).equals(192);
    expect(stream.readNumber(1)).equals(192);
  });

  it('PeekAndRead_MultiByteNumber', () => {
    array[0] = (1234 & 0xff);
    array[1] = ((1234 >> 8) & 0xff);
    const stream = new ByteStream(array.buffer);
    expect(stream.peekNumber(4)).equals(1234);
    expect(stream.readNumber(4)).equals(1234);
    expect(() => stream.readNumber(1)).to.throw();
  });

  it('PeekAndRead_SingleByteSignedNumber', () => {
    array[0] = -120;
    const stream = new ByteStream(array.buffer);
    expect(stream.peekSignedNumber(1)).equals(-120);
    expect(stream.readSignedNumber(1)).equals(-120);
  });

  it('PeekAndRead_SingleByteNegativeNumber', () => {
    array[0] = -128;
    const stream = new ByteStream(array.buffer);
    expect(stream.peekSignedNumber(1)).equals(-128);
    expect(stream.readSignedNumber(1)).equals(-128);
  });

  it('PeekAndRead_MultiByteSignedNumber', () => {
    array[0] = (1234 & 0xff);
    array[1] = ((1234 >> 8) & 0xff);
    const stream = new ByteStream(array.buffer);
    expect(stream.peekSignedNumber(2)).equals(1234);
    expect(stream.peekSignedNumber(2)).equals(1234);
  });

  it('PeekAndRead_MultiByteNegativeNumber', () => {
    array[0] = (-1234 & 0xff);
    array[1] = ((-1234 >> 8) & 0xff);
    const stream = new ByteStream(array.buffer);
    expect(stream.peekSignedNumber(2)).equals(-1234);
    expect(stream.peekSignedNumber(2)).equals(-1234);
  });

  it('ByteStreamReadBytesPastEnd', () => {
    const stream = new ByteStream(array.buffer);
    expect(() => stream.readBytes(5)).to.throw();
  });

  it('ReadStringPastEnd', () => {
    const stream = new ByteStream(array.buffer);
    expect(() => stream.readString(5)).to.throw();
  });

  it('PushThenReadNumber', () => {
    array = new Uint8Array(1);
    array[0] = (1234 & 0xff);
    const stream = new ByteStream(array.buffer);

    const anotherArray = new Uint8Array(1);
    anotherArray[0] = ((1234 >> 8) & 0xff);
    stream.push(anotherArray.buffer);

    expect(stream.readNumber(2)).equals(1234);
  });

  it('ReadBytesThenPushThenReadByte', () => {
    for (let i = 0; i < 4; ++i) array[i] = i;
    const stream = new ByteStream(array.buffer);

    const bytes = stream.readBytes(4);
    expect(() => stream.readBytes(1)).to.throw();

    const anotherArray = new Uint8Array(1);
    anotherArray[0] = 4;
    stream.push(anotherArray.buffer);

    expect(stream.readNumber(1), 'Could not read in byte after pushing').equals(4);
  });

  it('PushThenReadBytesAcrossOnePage', () => {
    for (let i = 0; i < 4; ++i) array[i] = i;
    const stream = new ByteStream(array.buffer);

    const anotherArray = new Uint8Array(1);
    anotherArray[0] = 4;
    stream.push(anotherArray.buffer);

    const bytes = stream.readBytes(5);
    expect(bytes.length).equals(5);
    for (let i = 0; i < 5; ++i) {
      expect(bytes[i]).equals(i);
    }
  });

  it('PushThenReadBytesAcrossMultiplePages', () => {
    for (let i = 0; i < 4; ++i) array[i] = i;
    const stream = new ByteStream(array.buffer);

    const anotherArray = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) anotherArray[i] = i + 4;

    const yetAnotherArray = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) yetAnotherArray[i] = i + 8;

    stream.push(anotherArray.buffer);
    stream.push(yetAnotherArray.buffer);

    const bytes = stream.readBytes(12);
    expect(bytes.length).equals(12);
    for (let i = 0; i < 12; ++i) {
      expect(bytes[i]).equals(i);
    }
  });

  it('PushThenReadStringAcrossMultiplePages', () => {
    for (let i = 0; i < 4; ++i) array[i] = 65 + i;
    const stream = new ByteStream(array.buffer);

    const anotherArray = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) anotherArray[i] = 69 + i;

    const yetAnotherArray = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) yetAnotherArray[i] = 73 + i;

    stream.push(anotherArray.buffer);
    stream.push(yetAnotherArray.buffer);

    const str = stream.readString(12);
    expect(str).equals('ABCDEFGHIJKL');
  });

  it('Tee', () => {
    for (let i = 0; i < 4; ++i) array[i] = 65 + i;
    const stream = new ByteStream(array.buffer);

    const anotherArray = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) anotherArray[i] = 69 + i;
    stream.push(anotherArray.buffer);

    const teed = stream.tee();
    teed.readBytes(5);
    expect(stream.getNumBytesLeft()).equals(8);
    expect(teed.getNumBytesLeft()).equals(3);
  });
});
