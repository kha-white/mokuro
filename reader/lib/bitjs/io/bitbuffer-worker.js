// THIS IS A GENERATED FILE!  DO NOT EDIT, INSTEAD EDIT THE FILE IN bitjs/build/io.
var bitjs = bitjs || {};
bitjs.io = bitjs.io || {};
bitjs.io.BitBuffer =
/*
 * bytebuffer-def.js
 *
 * Provides a writer for bits.
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 */

(function () {
  const BITMASK = [
    0,
    0b00000001,
    0b00000011,
    0b00000111,
    0b00001111,
    0b00011111,
    0b00111111,
    0b01111111,
    0b11111111,
  ]

  /**
   * A write-only Bit buffer which uses a Uint8Array as a backing store.
   */
  class BitBuffer {
    /**
     * @param {number} numBytes The number of bytes to allocate.
     * @param {boolean} mtl The bit-packing mode. True means pack bits from most-significant (7) to
     *     least-significant (0). Defaults false: least-significant (0) to most-significant (8).
     */
    constructor(numBytes, mtl = false) {
      if (typeof numBytes != typeof 1 || numBytes <= 0) {
        throw "Error! ByteBuffer initialized with '" + numBytes + "'";
      }

      /**
       * @type {Uint8Array}
       * @public
       */
      this.data = new Uint8Array(numBytes);

      /**
       * Whether we pack bits from most-significant-bit to least. Defaults false (least-to-most
       * significant bit packing).
       * @type {boolean}
       * @private
       */
      this.mtl = mtl;

      /**
       * The current byte we are filling with bits.
       * @type {number}
       * @public
       */
      this.bytePtr = 0;

      /**
       * Points at the bit within the current byte where the next bit will go. This number ranges
       * from 0 to 7 and the direction of packing is indicated by the mtl property.
       * @type {number}
       * @public
       */
      this.bitPtr = this.mtl ? 7 : 0;
    }

    /** @returns {boolean} */
    getPackingDirection() {
      return this.mtl;
    }

    /**
     * Sets the bit-packing direction. Default (false) is least-significant-bit (0) to
     * most-significant (7). Changing the bit-packing direction when the bit pointer is in the
     * middle of a byte will fill the rest of that byte with 0s using the current bit-packing
     * direction and then set the bit pointer to the appropriate bit of the next byte. If there
     * are no more bytes left in this buffer, it will throw an error.
     */
    setPackingDirection(mtl = false) {
      if (this.mtl !== mtl) {
        if (this.mtl && this.bitPtr !== 7) {
          this.bytePtr++;
          if (this.bytePtr >= this.data.byteLength) {
            throw `No more bytes left when switching packing direction`;
          }
          this.bitPtr = 7;
        } else if (!this.mtl && this.bitPtr !== 0) {
          this.bytePtr++;
          if (this.bytePtr >= this.data.byteLength) {
            throw `No more bytes left when switching packing direction`;
          }
          this.bitPtr = 0;
        }
      }

      this.mtl = mtl;
    }

    /**
     * writeBits(3, 6) is the same as writeBits(0b000011, 6).
     * Will throw an error (without writing) if this would over-flow the buffer.
     * @param {number} val The bits to pack into the buffer. Negative values are not allowed.
     * @param {number} numBits Must be positive, non-zero and less or equal to than 53, since
     *     JavaScript can only support 53-bit integers.
     */
    writeBits(val, numBits) {
      if (val < 0 || typeof val !== typeof 1) {
        throw `Trying to write an invalid value into the BitBuffer: ${val}`;
      }
      if (numBits < 0 || numBits > 53) {
        throw `Trying to write ${numBits} bits into the BitBuffer`;
      }

      const totalBitsInBuffer = this.data.byteLength * 8;
      const writtenBits = this.bytePtr * 8 + this.bitPtr;
      const bitsLeftInBuffer = totalBitsInBuffer - writtenBits;
      if (numBits > bitsLeftInBuffer) {
        throw `Trying to write ${numBits} into the BitBuffer that only has ${bitsLeftInBuffer}`;
      }

      // Least-to-most-significant bit packing method (LTM).
      if (!this.mtl) {
        let numBitsLeftToWrite = numBits;
        while (numBitsLeftToWrite > 0) {
          /** The number of bits available to fill in this byte. */
          const bitCapacityInThisByte = 8 - this.bitPtr;
          /** The number of bits of val we will write into this byte. */
          const numBitsToWriteIntoThisByte = Math.min(numBitsLeftToWrite, bitCapacityInThisByte);
          /** The number of bits that fit in subsequent bytes. */
          const numExcessBits = numBitsLeftToWrite - numBitsToWriteIntoThisByte;
          if (numExcessBits < 0) {
            throw `Error in LTM bit packing, # of excess bits is negative`;
          }
          /** The actual bits that need to be written into this byte. Starts at LSB. */
          let actualBitsToWrite = (val & BITMASK[numBitsToWriteIntoThisByte]);
          // Only adjust and write bits if any are set to 1.
          if (actualBitsToWrite > 0) {
            actualBitsToWrite <<= this.bitPtr;
            // Now write into the buffer.
            this.data[this.bytePtr] |= actualBitsToWrite;
          }
          // Update the bit/byte pointers and remaining bits to write.
          this.bitPtr += numBitsToWriteIntoThisByte;
          if (this.bitPtr > 7) {
            if (this.bitPtr !== 8) {
              throw `Error in LTM bit packing. Tried to write more bits than it should have.`;
            }
            this.bytePtr++;
            this.bitPtr = 0;
          }
          // Remove bits that have been written from LSB end.
          val >>= numBitsToWriteIntoThisByte;
          numBitsLeftToWrite -= numBitsToWriteIntoThisByte;
        }
      }
      // Most-to-least-significant bit packing method (MTL).
      else {
        let numBitsLeftToWrite = numBits;
        while (numBitsLeftToWrite > 0) {
          /** The number of bits available to fill in this byte. */
          const bitCapacityInThisByte = this.bitPtr + 1;
          /** The number of bits of val we will write into this byte. */
          const numBitsToWriteIntoThisByte = Math.min(numBitsLeftToWrite, bitCapacityInThisByte);
          /** The number of bits that fit in subsequent bytes. */
          const numExcessBits = numBitsLeftToWrite - numBitsToWriteIntoThisByte;
          if (numExcessBits < 0) {
            throw `Error in MTL bit packing, # of excess bits is negative`;
          }
          /** The actual bits that need to be written into this byte. Starts at MSB. */
          let actualBitsToWrite = ((val >> numExcessBits) & BITMASK[numBitsToWriteIntoThisByte]);
          // Only adjust and write bits if any are set to 1.
          if (actualBitsToWrite > 0) {
            // If the number of bits left to write do not fill up this byte, we need to shift these
            // bits to the left so they are written into the proper place in the buffer.
            if (numBitsLeftToWrite < bitCapacityInThisByte) {
              actualBitsToWrite <<= (bitCapacityInThisByte - numBitsLeftToWrite);
            }
            // Now write into the buffer.
            this.data[this.bytePtr] |= actualBitsToWrite;
          }
          // Update the bit/byte pointers and remaining bits to write
          this.bitPtr -= numBitsToWriteIntoThisByte;
          if (this.bitPtr < 0) {
            if (this.bitPtr !== -1) {
              throw `Error in MTL bit packing. Tried to write more bits than it should have.`;
            }
            this.bytePtr++;
            this.bitPtr = 7;
          }
          // Remove bits that have been written from MSB end.
          val -= (actualBitsToWrite << numExcessBits);
          numBitsLeftToWrite -= numBitsToWriteIntoThisByte;
        }
      }
    }
  }

  return BitBuffer;
})();
