export const ByteStream: {
    new (ab: ArrayBuffer, opt_offset?: number | undefined, opt_length?: number | undefined): {
        /**
         * The current page of bytes in the stream.
         * @type {Uint8Array}
         * @private
         */
        bytes: Uint8Array;
        /**
         * The next pages of bytes in the stream.
         * @type {Array<Uint8Array>}
         * @private
         */
        pages_: Array<Uint8Array>;
        /**
         * The byte in the current page that we will read next.
         * @type {Number}
         * @private
         */
        ptr: number;
        /**
         * An ever-increasing number.
         * @type {Number}
         * @private
         */
        bytesRead_: number;
        /**
         * Returns how many bytes have been read in the stream since the beginning of time.
         */
        getNumBytesRead(): number;
        /**
         * Returns how many bytes are currently in the stream left to be read.
         */
        getNumBytesLeft(): number;
        /**
         * Move the pointer ahead n bytes.  If the pointer is at the end of the current array
         * of bytes and we have another page of bytes, point at the new page.  This is a private
         * method, no validation is done.
         * @param {number} n Number of bytes to increment.
         * @private
         */
        movePointer_(n: number): void;
        /**
         * Peeks at the next n bytes as an unsigned number but does not advance the
         * pointer.
         * @param {number} n The number of bytes to peek at.  Must be a positive integer.
         * @returns {number} The n bytes interpreted as an unsigned number.
         */
        peekNumber(n: number): number;
        /**
         * Returns the next n bytes as an unsigned number (or -1 on error)
         * and advances the stream pointer n bytes.
         * @param {number} n The number of bytes to read.  Must be a positive integer.
         * @returns {number} The n bytes interpreted as an unsigned number.
         */
        readNumber(n: number): number;
        /**
         * Returns the next n bytes as a signed number but does not advance the
         * pointer.
         * @param {number} n The number of bytes to read.  Must be a positive integer.
         * @returns {number} The bytes interpreted as a signed number.
         */
        peekSignedNumber(n: number): number;
        /**
         * Returns the next n bytes as a signed number and advances the stream pointer.
         * @param {number} n The number of bytes to read.  Must be a positive integer.
         * @returns {number} The bytes interpreted as a signed number.
         */
        readSignedNumber(n: number): number;
        /**
         * This returns n bytes as a sub-array, advancing the pointer if movePointers
         * is true.
         * @param {number} n The number of bytes to read.  Must be a positive integer.
         * @param {boolean} movePointers Whether to move the pointers.
         * @returns {Uint8Array} The subarray.
         */
        peekBytes(n: number, movePointers: boolean): Uint8Array;
        /**
         * Reads the next n bytes as a sub-array.
         * @param {number} n The number of bytes to read.  Must be a positive integer.
         * @returns {Uint8Array} The subarray.
         */
        readBytes(n: number): Uint8Array;
        /**
         * Peeks at the next n bytes as an ASCII string but does not advance the pointer.
         * @param {number} n The number of bytes to peek at.  Must be a positive integer.
         * @returns {string} The next n bytes as a string.
         */
        peekString(n: number): string;
        /**
         * Returns the next n bytes as an ASCII string and advances the stream pointer
         * n bytes.
         * @param {number} n The number of bytes to read.  Must be a positive integer.
         * @returns {string} The next n bytes as a string.
         */
        readString(n: number): string;
        /**
         * Feeds more bytes into the back of the stream.
         * @param {ArrayBuffer} ab
         */
        push(ab: ArrayBuffer): void;
        /**
         * Creates a new ByteStream from this ByteStream that can be read / peeked.
         * @returns {ByteStream} A clone of this ByteStream.
         */
        tee(): any;
    };
};
//# sourceMappingURL=bytestream.d.ts.map