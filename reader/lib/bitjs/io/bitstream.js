// THIS IS A GENERATED FILE!  DO NOT EDIT, INSTEAD EDIT THE FILE IN bitjs/build/io.
export const BitStream =
/*
 * bitstream-def.js
 *
 * Provides readers for bitstreams.
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2011 Google Inc.
 * Copyright(c) 2011 antimatter15
 */

(function () {
  // mask for getting N number of bits (0-8)
  const BITMASK = [0, 0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF];

  /**
   * This object allows you to peek and consume bits and bytes out of a stream.
   * Note that this stream is optimized, and thus, will *NOT* throw an error if
   * the end of the stream is reached.  Only use this in scenarios where you
   * already have all the bits you need.
   */
  class BitStream {
    /**
     * @param {ArrayBuffer} ab An ArrayBuffer object or a Uint8Array.
     * @param {boolean} mtl Whether the stream reads bits from the byte starting with the
     *     most-significant-bit (bit 7) to least-significant (bit 0). False means the direciton is
     *     from least-significant-bit (bit 0) to most-significant (bit 7).
     * @param {Number} opt_offset The offset into the ArrayBuffer
     * @param {Number} opt_length The length of this BitStream
     */
    constructor(ab, mtl, opt_offset, opt_length) {
      if (!(ab instanceof ArrayBuffer)) {
        throw 'Error! BitArray constructed with an invalid ArrayBuffer object';
      }

      const offset = opt_offset || 0;
      const length = opt_length || ab.byteLength;

      /**
       * The bytes in the stream.
       * @type {Uint8Array}
       * @private
       */
      this.bytes = new Uint8Array(ab, offset, length);

      /**
       * The byte in the stream that we are currently on.
       * @type {Number}
       * @private
       */
      this.bytePtr = 0;

      /**
       * The bit in the current byte that we will read next (can have values 0 through 7).
       * @type {Number}
       * @private
       */
      this.bitPtr = 0; // tracks which bit we are on (can have values 0 through 7)

      /**
       * An ever-increasing number.
       * @type {Number}
       * @private
       */
      this.bitsRead_ = 0;

      this.peekBits = mtl ? this.peekBits_mtl : this.peekBits_ltm;
    }

    /**
     * Returns how many bites have been read in the stream since the beginning of time.
     */
    getNumBitsRead() {
      return this.bitsRead_;
    }

    /**
     * Returns how many bits are currently in the stream left to be read.
     */
    getNumBitsLeft() {
      const bitsLeftInByte = 8 - this.bitPtr;
      return (this.bytes.byteLength - this.bytePtr - 1) * 8 + bitsLeftInByte;
    }

    /**
     *   byte0      byte1      byte2      byte3
     * 7......0 | 7......0 | 7......0 | 7......0
     *
     * The bit pointer starts at least-significant bit (0) of byte0 and moves left until it reaches
     * bit7 of byte0, then jumps to bit0 of byte1, etc.
     * @param {number} n The number of bits to peek, must be a positive integer.
     * @param {boolean=} movePointers Whether to move the pointer, defaults false.
     * @returns {number} The peeked bits, as an unsigned number.
     */
    peekBits_ltm(n, opt_movePointers) {
      const NUM = parseInt(n, 10);
      let num = NUM;
      if (n !== num || num <= 0) {
        return 0;
      }

      const movePointers = opt_movePointers || false;
      let bytes = this.bytes;
      let bytePtr = this.bytePtr;
      let bitPtr = this.bitPtr;
      let result = 0;
      let bitsIn = 0;

      // keep going until we have no more bits left to peek at
      while (num > 0) {
        // We overflowed the stream, so just return what we got.
        if (bytePtr >= bytes.length) {
          break;
        }

        const numBitsLeftInThisByte = (8 - bitPtr);
        if (num >= numBitsLeftInThisByte) {
          const mask = (BITMASK[numBitsLeftInThisByte] << bitPtr);
          result |= (((bytes[bytePtr] & mask) >> bitPtr) << bitsIn);

          bytePtr++;
          bitPtr = 0;
          bitsIn += numBitsLeftInThisByte;
          num -= numBitsLeftInThisByte;
        } else {
          const mask = (BITMASK[num] << bitPtr);
          result |= (((bytes[bytePtr] & mask) >> bitPtr) << bitsIn);

          bitPtr += num;
          break;
        }
      }

      if (movePointers) {
        this.bitPtr = bitPtr;
        this.bytePtr = bytePtr;
        this.bitsRead_ += NUM;
      }

      return result;
    }

    /**
     *   byte0      byte1      byte2      byte3
     * 7......0 | 7......0 | 7......0 | 7......0
     *
     * The bit pointer starts at bit7 of byte0 and moves right until it reaches
     * bit0 of byte0, then goes to bit7 of byte1, etc.
     * @param {number} n The number of bits to peek.  Must be a positive integer.
     * @param {boolean=} movePointers Whether to move the pointer, defaults false.
     * @returns {number} The peeked bits, as an unsigned number.
     */
    peekBits_mtl(n, opt_movePointers) {
      const NUM = parseInt(n, 10);
      let num = NUM;
      if (n !== num || num <= 0) {
        return 0;
      }

      const movePointers = opt_movePointers || false;
      let bytes = this.bytes;
      let bytePtr = this.bytePtr;
      let bitPtr = this.bitPtr;
      let result = 0;

      // keep going until we have no more bits left to peek at
      while (num > 0) {
        // We overflowed the stream, so just return the bits we got.
        if (bytePtr >= bytes.length) {
          break;
        }

        const numBitsLeftInThisByte = (8 - bitPtr);
        if (num >= numBitsLeftInThisByte) {
          result <<= numBitsLeftInThisByte;
          result |= (BITMASK[numBitsLeftInThisByte] & bytes[bytePtr]);
          bytePtr++;
          bitPtr = 0;
          num -= numBitsLeftInThisByte;
        } else {
          result <<= num;
          const numBits = 8 - num - bitPtr;
          result |= ((bytes[bytePtr] & (BITMASK[num] << numBits)) >> numBits);

          bitPtr += num;
          break;
        }
      }

      if (movePointers) {
        this.bitPtr = bitPtr;
        this.bytePtr = bytePtr;
        this.bitsRead_ += NUM;
      }

      return result;
    }

    /**
     * Peek at 16 bits from current position in the buffer.
     * Bit at (bytePtr,bitPtr) has the highest position in returning data.
     * Taken from getbits.hpp in unrar.
     * TODO: Move this out of BitStream and into unrar.
     */
    getBits() {
      return (((((this.bytes[this.bytePtr] & 0xff) << 16) +
        ((this.bytes[this.bytePtr + 1] & 0xff) << 8) +
        ((this.bytes[this.bytePtr + 2] & 0xff))) >>> (8 - this.bitPtr)) & 0xffff);
    }

    /**
     * Reads n bits out of the stream, consuming them (moving the bit pointer).
     * @param {number} n The number of bits to read.  Must be a positive integer.
     * @returns {number} The read bits, as an unsigned number.
     */
    readBits(n) {
      return this.peekBits(n, true);
    }

    /**
     * This returns n bytes as a sub-array, advancing the pointer if movePointers
     * is true.  Only use this for uncompressed blocks as this throws away remaining
     * bits in the current byte.
     * @param {number} n The number of bytes to peek.  Must be a positive integer.
     * @param {boolean=} movePointers Whether to move the pointer, defaults false.
     * @returns {Uint8Array} The subarray.
     */
    peekBytes(n, opt_movePointers) {
      const num = parseInt(n, 10);
      if (n !== num || num < 0) {
        throw 'Error!  Called peekBytes() with a non-positive integer: ' + n;
      } else if (num === 0) {
        return new Uint8Array();
      }

      // Flush bits until we are byte-aligned.
      // from http://tools.ietf.org/html/rfc1951#page-11
      // "Any bits of input up to the next byte boundary are ignored."
      while (this.bitPtr != 0) {
        this.readBits(1);
      }

      const numBytesLeft = this.getNumBitsLeft() / 8;
      if (num > numBytesLeft) {
        throw 'Error!  Overflowed the bit stream! n=' + num + ', bytePtr=' + this.bytePtr +
        ', bytes.length=' + this.bytes.length + ', bitPtr=' + this.bitPtr;
      }

      const movePointers = opt_movePointers || false;
      const result = new Uint8Array(num);
      let bytes = this.bytes;
      let ptr = this.bytePtr;
      let bytesLeftToCopy = num;
      while (bytesLeftToCopy > 0) {
        const bytesLeftInStream = bytes.length - ptr;
        const sourceLength = Math.min(bytesLeftToCopy, bytesLeftInStream);

        result.set(bytes.subarray(ptr, ptr + sourceLength), num - bytesLeftToCopy);

        ptr += sourceLength;
        // Overflowed the stream, just return what we got.
        if (ptr >= bytes.length) {
          break;
        }

        bytesLeftToCopy -= sourceLength;
      }

      if (movePointers) {
        this.bytePtr += num;
        this.bitsRead_ += (num * 8);
      }

      return result;
    }

    /**
     * @param {number} n The number of bytes to read.
     * @returns {Uint8Array} The subarray.
     */
    readBytes(n) {
      return this.peekBytes(n, true);
    }
  }

  return BitStream;
})();
