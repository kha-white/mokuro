export const BitStream: {
    new (ab: ArrayBuffer, mtl: boolean, opt_offset: number, opt_length: number): {
        /**
         * The bytes in the stream.
         * @type {Uint8Array}
         * @private
         */
        bytes: Uint8Array;
        /**
         * The byte in the stream that we are currently on.
         * @type {Number}
         * @private
         */
        bytePtr: number;
        /**
         * The bit in the current byte that we will read next (can have values 0 through 7).
         * @type {Number}
         * @private
         */
        bitPtr: number;
        /**
         * An ever-increasing number.
         * @type {Number}
         * @private
         */
        bitsRead_: number;
        peekBits: (n: number, opt_movePointers: any) => number;
        /**
         * Returns how many bites have been read in the stream since the beginning of time.
         */
        getNumBitsRead(): number;
        /**
         * Returns how many bits are currently in the stream left to be read.
         */
        getNumBitsLeft(): number;
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
        peekBits_ltm(n: number, opt_movePointers: any): number;
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
        peekBits_mtl(n: number, opt_movePointers: any): number;
        /**
         * Peek at 16 bits from current position in the buffer.
         * Bit at (bytePtr,bitPtr) has the highest position in returning data.
         * Taken from getbits.hpp in unrar.
         * TODO: Move this out of BitStream and into unrar.
         */
        getBits(): number;
        /**
         * Reads n bits out of the stream, consuming them (moving the bit pointer).
         * @param {number} n The number of bits to read.  Must be a positive integer.
         * @returns {number} The read bits, as an unsigned number.
         */
        readBits(n: number): number;
        /**
         * This returns n bytes as a sub-array, advancing the pointer if movePointers
         * is true.  Only use this for uncompressed blocks as this throws away remaining
         * bits in the current byte.
         * @param {number} n The number of bytes to peek.  Must be a positive integer.
         * @param {boolean=} movePointers Whether to move the pointer, defaults false.
         * @returns {Uint8Array} The subarray.
         */
        peekBytes(n: number, opt_movePointers: any): Uint8Array;
        /**
         * @param {number} n The number of bytes to read.
         * @returns {Uint8Array} The subarray.
         */
        readBytes(n: number): Uint8Array;
    };
};
//# sourceMappingURL=bitstream.d.ts.map