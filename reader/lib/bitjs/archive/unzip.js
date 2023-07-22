/**
 * unzip.js
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2011 Google Inc.
 * Copyright(c) 2011 antimatter15
 *
 * Reference Documentation:
 *
 * ZIP format: http://www.pkware.com/documents/casestudies/APPNOTE.TXT
 * DEFLATE format: http://tools.ietf.org/html/rfc1951
 */

// This file expects to be invoked as a Worker (see onmessage below).
import {BitStream} from '../io/bitstream-worker.js';
import {ByteBuffer} from '../io/bytebuffer-worker.js';
import {ByteStream} from '../io/bytestream-worker.js';

var bitjs = {
  io:{
    BitStream: BitStream,
    ByteBuffer: ByteBuffer,
    ByteStream: ByteStream
  }
}

const UnarchiveState = {
  NOT_STARTED: 0,
  UNARCHIVING: 1,
  WAITING: 2,
  FINISHED: 3,
};

// State - consider putting these into a class.
let unarchiveState = UnarchiveState.NOT_STARTED;
let bytestream = null;
let allLocalFiles = null;
let logToConsole = false;

// Progress variables.
let currentFilename = '';
let currentFileNumber = 0;
let currentBytesUnarchivedInFile = 0;
let currentBytesUnarchived = 0;
let totalUncompressedBytesInArchive = 0;
let totalFilesInArchive = 0;

// Helper functions.
const info = function (str) {
  postMessage({ type: 'info', msg: str });
};
const err = function (str) {
  postMessage({ type: 'error', msg: str });
};
const postProgress = function () {
  postMessage({
    type: 'progress',
    currentFilename,
    currentFileNumber,
    currentBytesUnarchivedInFile,
    currentBytesUnarchived,
    totalUncompressedBytesInArchive,
    totalFilesInArchive,
    totalCompressedBytesRead: bytestream.getNumBytesRead(),
  });
};

const zLocalFileHeaderSignature = 0x04034b50;
const zArchiveExtraDataSignature = 0x08064b50;
const zCentralFileHeaderSignature = 0x02014b50;
const zDigitalSignatureSignature = 0x05054b50;
const zEndOfCentralDirSignature = 0x06054b50;
const zEndOfCentralDirLocatorSignature = 0x07064b50;
const zDataDescriptorSignature = 0x08074b50;

// mask for getting the Nth bit (zero-based)
const BIT = [0x01, 0x02, 0x04, 0x08,
  0x10, 0x20, 0x40, 0x80,
  0x100, 0x200, 0x400, 0x800,
  0x1000, 0x2000, 0x4000, 0x8000];

class ZipLocalFile {
  /**
   * @param {bitjs.io.ByteStream} bstream
   */
  constructor(bstream) {
    if (typeof bstream != typeof {} || !bstream.readNumber || typeof bstream.readNumber != typeof function () { }) {
      return null;
    }

    bstream.readNumber(4); // swallow signature
    this.version = bstream.readNumber(2);
    this.generalPurpose = bstream.readNumber(2);
    this.compressionMethod = bstream.readNumber(2);
    this.lastModFileTime = bstream.readNumber(2);
    this.lastModFileDate = bstream.readNumber(2);
    this.crc32 = bstream.readNumber(4);
    this.compressedSize = bstream.readNumber(4);
    this.uncompressedSize = bstream.readNumber(4);
    this.fileNameLength = bstream.readNumber(2);
    this.extraFieldLength = bstream.readNumber(2);

    this.filename = null;
    if (this.fileNameLength > 0) {
      this.filenameBytes = bstream.peekBytes(this.fileNameLength);
      this.filename = bstream.readString(this.fileNameLength);
    }

    this.extraField = null;
    if (this.extraFieldLength > 0) {
      this.extraField = bstream.readString(this.extraFieldLength);
    }

    // Data descriptor is present if this bit is set, compressed size should be zero.
    this.hasDataDescriptor = ((this.generalPurpose & BIT[3]) !== 0);
    if (this.hasDataDescriptor &&
      (this.crc32 !== 0 || this.compressedSize !== 0 || this.uncompressedSize !== 0)) {
      err('Zip local file with a data descriptor and non-zero crc/compressedSize/uncompressedSize');
    }

    // Read in the compressed data if we have no data descriptor.
    /** @type {Uint8Array} */
    this.fileData = null;
    let descriptorSize = 0;
    if (this.hasDataDescriptor) {
      // Hold on to a reference to the bstream, since that is where the compressed file data begins.
      let savedBstream = bstream.tee();

      // Seek ahead one byte at a time, looking for the next local file header signature or the end
      // of all local files.
      let foundDataDescriptor = false;
      let numBytesSeeked = 0;
      while (!foundDataDescriptor) {
        while (bstream.peekNumber(4) !== zLocalFileHeaderSignature &&
          bstream.peekNumber(4) !== zArchiveExtraDataSignature &&
          bstream.peekNumber(4) !== zCentralFileHeaderSignature) {
          numBytesSeeked++;
          bstream.readBytes(1);
        }

        // Copy all the read bytes into a buffer and examine the last 16 bytes to see if they are the
        // data descriptor.
        let bufferedByteArr = savedBstream.peekBytes(numBytesSeeked);
        const descriptorStream = new bitjs.io.ByteStream(bufferedByteArr.buffer, numBytesSeeked - 16, 16);
        const maybeDescriptorSig = descriptorStream.readNumber(4);
        const maybeCrc32 = descriptorStream.readNumber(4);
        const maybeCompressedSize = descriptorStream.readNumber(4);
        const maybeUncompressedSize = descriptorStream.readNumber(4);

        // From the PKZIP App Note: "The signature value 0x08074b50 is also used by some ZIP
        // implementations as a marker for the Data Descriptor record".
        if (maybeDescriptorSig === zDataDescriptorSignature) {
          if (maybeCompressedSize === (numBytesSeeked - 16)) {
            foundDataDescriptor = true;
            descriptorSize = 16;
          }
        } else if (maybeCompressedSize === (numBytesSeeked - 12)) {
          foundDataDescriptor = true;
          descriptorSize = 12;
        }

        if (foundDataDescriptor) {
          this.crc32 = maybeCrc32;
          this.compressedSize = maybeCompressedSize;
          this.uncompressedSize = maybeUncompressedSize;
        }
      }
      bstream = savedBstream;
    }

    this.fileData = new Uint8Array(bstream.readBytes(this.compressedSize));
    bstream.readBytes(descriptorSize);

    // Now that we have all the bytes for this file, we can print out some information.
    if (logToConsole) {
      info('Zip Local File Header:');
      info(` version=${this.version}`);
      info(` general purpose=${this.generalPurpose}`);
      info(` compression method=${this.compressionMethod}`);
      info(` last mod file time=${this.lastModFileTime}`);
      info(` last mod file date=${this.lastModFileDate}`);
      info(` crc32=${this.crc32}`);
      info(` compressed size=${this.compressedSize}`);
      info(` uncompressed size=${this.uncompressedSize}`);
      info(` file name length=${this.fileNameLength}`);
      info(` extra field length=${this.extraFieldLength}`);
      info(` filename = '${this.filename}'`);
      info(` hasDataDescriptor = ${this.hasDataDescriptor}`);
    }
  }

  // determine what kind of compressed data we have and decompress
  unzip() {
    if (!this.fileData) {
      err('unzip() called on a file with out compressed file data');
    }

    // Zip Version 1.0, no compression (store only)
    if (this.compressionMethod == 0) {
      if (logToConsole) {
        info(`ZIP v${this.version}, store only: ${this.filename} (${this.compressedSize} bytes)`);
      }
      currentBytesUnarchivedInFile = this.compressedSize;
      currentBytesUnarchived += this.compressedSize;
    }
    // version == 20, compression method == 8 (DEFLATE)
    else if (this.compressionMethod == 8) {
      if (logToConsole) {
        info(`ZIP v2.0, DEFLATE: ${this.filename} (${this.compressedSize} bytes)`);
      }
      this.fileData = inflate(this.fileData, this.uncompressedSize);
    }
    else {
      err(`UNSUPPORTED VERSION/FORMAT: ZIP v${this.version}, ` +
        `compression method=${this.compressionMethod}: ` +
        `${this.filename} (${this.compressedSize} bytes)`);
      this.fileData = null;
    }
  }
}

/**
 * @typedef SymbolLengthPair
 * @property {number} length
 * @property {number} symbol
 */

/**
 * Returns a table of Huffman codes. Each entry's key is its code and its value is a JavaScript
 * object containing {length: 6, symbol: X}.
 * @param {number[]} bitLengths An array representing the bit lengths of the codes, in order.
 *     See section 3.2.2 of https://datatracker.ietf.org/doc/html/rfc1951.
 * @returns {Map<number, SymbolLengthPair>}
 */
function getHuffmanCodes(bitLengths) {
  // ensure bitLengths is an array containing at least one element
  if (typeof bitLengths != typeof [] || bitLengths.length < 1) {
    err('Error! getHuffmanCodes() called with an invalid array');
    return null;
  }

  // Reference: http://tools.ietf.org/html/rfc1951#page-8
  const numLengths = bitLengths.length;
  const bl_count = [];
  let MAX_BITS = 1;

  // Step 1: count up how many codes of each length we have
  for (let i = 0; i < numLengths; ++i) {
    const length = bitLengths[i];
    // test to ensure each bit length is a positive, non-zero number
    if (typeof length != typeof 1 || length < 0) {
      err(`bitLengths contained an invalid number in getHuffmanCodes(): ${length} of type ${typeof length}`);
      return null;
    }
    // increment the appropriate bitlength count
    if (bl_count[length] == undefined) bl_count[length] = 0;
    // a length of zero means this symbol is not participating in the huffman coding
    if (length > 0) bl_count[length]++;
    if (length > MAX_BITS) MAX_BITS = length;
  }

  // Step 2: Find the numerical value of the smallest code for each code length
  const next_code = [];
  let code = 0;
  for (let bits = 1; bits <= MAX_BITS; ++bits) {
    const length = bits - 1;
    // ensure undefined lengths are zero
    if (bl_count[length] == undefined) bl_count[length] = 0;
    code = (code + bl_count[bits - 1]) << 1;
    next_code[bits] = code;
  }

  // Step 3: Assign numerical values to all codes
  /** @type Map<number, SymbolLengthPair> */
  const table = new Map();
  for (let n = 0; n < numLengths; ++n) {
    const len = bitLengths[n];
    if (len != 0) {
      table.set(next_code[len], { length: len, symbol: n });
      next_code[len]++;
    }
  }

  return table;
}

/*
     The Huffman codes for the two alphabets are fixed, and are not
     represented explicitly in the data.  The Huffman code lengths
     for the literal/length alphabet are:

               Lit Value    Bits        Codes
               ---------    ----        -----
                 0 - 143     8          00110000 through
                                        10111111
               144 - 255     9          110010000 through
                                        111111111
               256 - 279     7          0000000 through
                                        0010111
               280 - 287     8          11000000 through
                                        11000111
*/
// fixed Huffman codes go from 7-9 bits, so we need an array whose index can hold up to 9 bits
let fixedHCtoLiteral = null;
let fixedHCtoDistance = null;
/** @returns {Map<number, SymbolLengthPair>} */
function getFixedLiteralTable() {
  // create once
  if (!fixedHCtoLiteral) {
    const bitlengths = new Array(288);
    for (let i = 0; i <= 143; ++i) bitlengths[i] = 8;
    for (let i = 144; i <= 255; ++i) bitlengths[i] = 9;
    for (let i = 256; i <= 279; ++i) bitlengths[i] = 7;
    for (let i = 280; i <= 287; ++i) bitlengths[i] = 8;

    // get huffman code table
    fixedHCtoLiteral = getHuffmanCodes(bitlengths);
  }
  return fixedHCtoLiteral;
}

/** @returns {Map<number, SymbolLengthPair>} */
function getFixedDistanceTable() {
  // create once
  if (!fixedHCtoDistance) {
    const bitlengths = new Array(32);
    for (let i = 0; i < 32; ++i) { bitlengths[i] = 5; }

    // get huffman code table
    fixedHCtoDistance = getHuffmanCodes(bitlengths);
  }
  return fixedHCtoDistance;
}

/**
 * Extract one bit at a time until we find a matching Huffman Code
 * then return that symbol.
 * @param {bitjs.io.BitStream} bstream
 * @param {Map<number, SymbolLengthPair>} hcTable
 * @returns {number}
 */
function decodeSymbol(bstream, hcTable) {
  let code = 0;
  let len = 0;

  // loop until we match
  for (; ;) {
    // read in next bit
    const bit = bstream.readBits(1);
    code = (code << 1) | bit;
    ++len;

    // check against Huffman Code table and break if found
    if (hcTable.has(code) && hcTable.get(code).length == len) {
      break;
    }
    if (len > hcTable.length) {
      err(`Bit stream out of sync, didn't find a Huffman Code, length was ${len} ` +
        `and table only max code length of ${hcTable.length}`);
      break;
    }
  }
  return hcTable.get(code).symbol;
}


const CodeLengthCodeOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/*
     Extra               Extra               Extra
Code Bits Length(s) Code Bits Lengths   Code Bits Length(s)
---- ---- ------     ---- ---- -------   ---- ---- -------
 257   0     3       267   1   15,16     277   4   67-82
 258   0     4       268   1   17,18     278   4   83-98
 259   0     5       269   2   19-22     279   4   99-114
 260   0     6       270   2   23-26     280   4  115-130
 261   0     7       271   2   27-30     281   5  131-162
 262   0     8       272   2   31-34     282   5  163-194
 263   0     9       273   3   35-42     283   5  195-226
 264   0    10       274   3   43-50     284   5  227-257
 265   1  11,12      275   3   51-58     285   0    258
 266   1  13,14      276   3   59-66
*/
const LengthLookupTable = [
  [0, 3], [0, 4], [0, 5], [0, 6],
  [0, 7], [0, 8], [0, 9], [0, 10],
  [1, 11], [1, 13], [1, 15], [1, 17],
  [2, 19], [2, 23], [2, 27], [2, 31],
  [3, 35], [3, 43], [3, 51], [3, 59],
  [4, 67], [4, 83], [4, 99], [4, 115],
  [5, 131], [5, 163], [5, 195], [5, 227],
  [0, 258]
];

/*
      Extra           Extra                Extra
 Code Bits Dist  Code Bits   Dist     Code Bits Distance
 ---- ---- ----  ---- ----  ------    ---- ---- --------
   0   0    1     10   4     33-48    20    9   1025-1536
   1   0    2     11   4     49-64    21    9   1537-2048
   2   0    3     12   5     65-96    22   10   2049-3072
   3   0    4     13   5     97-128   23   10   3073-4096
   4   1   5,6    14   6    129-192   24   11   4097-6144
   5   1   7,8    15   6    193-256   25   11   6145-8192
   6   2   9-12   16   7    257-384   26   12  8193-12288
   7   2  13-16   17   7    385-512   27   12 12289-16384
   8   3  17-24   18   8    513-768   28   13 16385-24576
   9   3  25-32   19   8   769-1024   29   13 24577-32768
*/
const DistLookupTable = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 5], [1, 7],
  [2, 9], [2, 13],
  [3, 17], [3, 25],
  [4, 33], [4, 49],
  [5, 65], [5, 97],
  [6, 129], [6, 193],
  [7, 257], [7, 385],
  [8, 513], [8, 769],
  [9, 1025], [9, 1537],
  [10, 2049], [10, 3073],
  [11, 4097], [11, 6145],
  [12, 8193], [12, 12289],
  [13, 16385], [13, 24577]
];

/**
 * @param {bitjs.io.BitStream} bstream
 * @param {Map<number, SymbolLengthPair>} hcLiteralTable
 * @param {Map<number, SymbolLengthPair>} hcDistanceTable
 * @param {bitjs.io.ByteBuffer} buffer
 * @returns
 */
function inflateBlockData(bstream, hcLiteralTable, hcDistanceTable, buffer) {
  /*
      loop (until end of block code recognized)
         decode literal/length value from input stream
         if value < 256
            copy value (literal byte) to output stream
         otherwise
            if value = end of block (256)
               break from loop
            otherwise (value = 257..285)
               decode distance from input stream

               move backwards distance bytes in the output
               stream, and copy length bytes from this
               position to the output stream.
  */
  let blockSize = 0;
  for (; ;) {
    const symbol = decodeSymbol(bstream, hcLiteralTable);
    if (symbol < 256) {
      // copy literal byte to output
      buffer.insertByte(symbol);
      blockSize++;
    } else {
      // end of block reached
      if (symbol == 256) {
        break;
      } else {
        const lengthLookup = LengthLookupTable[symbol - 257];
        let length = lengthLookup[1] + bstream.readBits(lengthLookup[0]);
        const distLookup = DistLookupTable[decodeSymbol(bstream, hcDistanceTable)];
        let distance = distLookup[1] + bstream.readBits(distLookup[0]);

        // now apply length and distance appropriately and copy to output

        // TODO: check that backward distance < data.length?

        // http://tools.ietf.org/html/rfc1951#page-11
        // "Note also that the referenced string may overlap the current
        //  position; for example, if the last 2 bytes decoded have values
        //  X and Y, a string reference with <length = 5, distance = 2>
        //  adds X,Y,X,Y,X to the output stream."
        //
        // loop for each character
        let ch = buffer.ptr - distance;
        blockSize += length;
        if (length > distance) {
          const data = buffer.data;
          while (length--) {
            buffer.insertByte(data[ch++]);
          }
        } else {
          buffer.insertBytes(buffer.data.subarray(ch, ch + length))
        }
      } // length-distance pair
    } // length-distance pair or end-of-block
  } // loop until we reach end of block
  return blockSize;
}

/**
 * Compression method 8. Deflate: http://tools.ietf.org/html/rfc1951
 * @param {Uint8Array} compressedData A Uint8Array of the compressed file data.
 * @param {number} numDecompressedBytes
 * @returns {Uint8Array} The decompressed array.
 */
function inflate(compressedData, numDecompressedBytes) {
  // Bit stream representing the compressed data.
  /** @type {bitjs.io.BitStream} */
  const bstream = new bitjs.io.BitStream(compressedData.buffer,
    false /* mtl */,
    compressedData.byteOffset,
    compressedData.byteLength);
  /** @type {bitjs.io.ByteBuffer} */
  const buffer = new bitjs.io.ByteBuffer(numDecompressedBytes);
  let blockSize = 0;

  // block format: http://tools.ietf.org/html/rfc1951#page-9
  let bFinal = 0;
  do {
    bFinal = bstream.readBits(1);
    let bType = bstream.readBits(2);
    blockSize = 0;
    // no compression
    if (bType == 0) {
      // skip remaining bits in this byte
      while (bstream.bitPtr != 0) bstream.readBits(1);
      const len = bstream.readBits(16);
      const nlen = bstream.readBits(16);
      // TODO: check if nlen is the ones-complement of len?
      if (len > 0) buffer.insertBytes(bstream.readBytes(len));
      blockSize = len;
    }
    // fixed Huffman codes
    else if (bType == 1) {
      blockSize = inflateBlockData(bstream, getFixedLiteralTable(), getFixedDistanceTable(), buffer);
    }
    // dynamic Huffman codes
    else if (bType == 2) {
      const numLiteralLengthCodes = bstream.readBits(5) + 257;
      const numDistanceCodes = bstream.readBits(5) + 1;
      const numCodeLengthCodes = bstream.readBits(4) + 4;

      // populate the array of code length codes (first de-compaction)
      const codeLengthsCodeLengths = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < numCodeLengthCodes; ++i) {
        codeLengthsCodeLengths[CodeLengthCodeOrder[i]] = bstream.readBits(3);
      }

      // get the Huffman Codes for the code lengths
      const codeLengthsCodes = getHuffmanCodes(codeLengthsCodeLengths);

      // now follow this mapping
      /*
        0 - 15: Represent code lengths of 0 - 15
            16: Copy the previous code length 3 - 6 times.
                The next 2 bits indicate repeat length
                (0 = 3, ... , 3 = 6)
                Example:  Codes 8, 16 (+2 bits 11),
                          16 (+2 bits 10) will expand to
                          12 code lengths of 8 (1 + 6 + 5)
            17: Repeat a code length of 0 for 3 - 10 times.
                (3 bits of length)
            18: Repeat a code length of 0 for 11 - 138 times
                (7 bits of length)
      */
      // to generate the true code lengths of the Huffman Codes for the literal
      // and distance tables together
      const literalCodeLengths = [];
      let prevCodeLength = 0;
      const maxCodeLengths = numLiteralLengthCodes + numDistanceCodes;
      while (literalCodeLengths.length < maxCodeLengths) {
        const symbol = decodeSymbol(bstream, codeLengthsCodes);
        if (symbol <= 15) {
          literalCodeLengths.push(symbol);
          prevCodeLength = symbol;
        } else if (symbol === 16) {
          let repeat = bstream.readBits(2) + 3;
          while (repeat--) {
            literalCodeLengths.push(prevCodeLength);
          }
        } else if (symbol === 17) {
          let repeat = bstream.readBits(3) + 3;
          while (repeat--) {
            literalCodeLengths.push(0);
          }
        } else if (symbol == 18) {
          let repeat = bstream.readBits(7) + 11;
          while (repeat--) {
            literalCodeLengths.push(0);
          }
        }
      }

      // now split the distance code lengths out of the literal code array
      const distanceCodeLengths = literalCodeLengths.splice(numLiteralLengthCodes, numDistanceCodes);

      // now generate the true Huffman Code tables using these code lengths
      const hcLiteralTable = getHuffmanCodes(literalCodeLengths);
      const hcDistanceTable = getHuffmanCodes(distanceCodeLengths);
      blockSize = inflateBlockData(bstream, hcLiteralTable, hcDistanceTable, buffer);
    } else { // error
      err('Error! Encountered deflate block of type 3');
      return null;
    }

    // update progress
    currentBytesUnarchivedInFile += blockSize;
    currentBytesUnarchived += blockSize;
    postProgress();
  } while (bFinal != 1);
  // we are done reading blocks if the bFinal bit was set for this block

  // return the buffer data bytes
  return buffer.data;
}

function archiveUnzip() {
  let bstream = bytestream.tee();

  // loop until we don't see any more local files or we find a data descriptor.
  while (bstream.peekNumber(4) == zLocalFileHeaderSignature) {
    // Note that this could throw an error if the bstream overflows, which is caught in the
    // message handler.
    const oneLocalFile = new ZipLocalFile(bstream);
    // this should strip out directories/folders
    if (oneLocalFile && oneLocalFile.uncompressedSize > 0 && oneLocalFile.fileData) {
      // If we make it to this point and haven't thrown an error, we have successfully
      // read in the data for a local file, so we can update the actual bytestream.
      bytestream = bstream.tee();

      allLocalFiles.push(oneLocalFile);
      totalUncompressedBytesInArchive += oneLocalFile.uncompressedSize;

      // update progress
      currentFilename = oneLocalFile.filename;
      currentFileNumber = allLocalFiles.length - 1;
      currentBytesUnarchivedInFile = 0;

      // Actually do the unzipping.
      oneLocalFile.unzip();

      if (oneLocalFile.fileData != null) {
        postMessage({ type: 'extract', unarchivedFile: oneLocalFile }, [oneLocalFile.fileData.buffer]);
        postProgress();
      }
    }
  }
  totalFilesInArchive = allLocalFiles.length;

  // archive extra data record
  if (bstream.peekNumber(4) == zArchiveExtraDataSignature) {
    if (logToConsole) {
      info(' Found an Archive Extra Data Signature');
    }

    // skipping this record for now
    bstream.readNumber(4);
    const archiveExtraFieldLength = bstream.readNumber(4);
    bstream.readString(archiveExtraFieldLength);
  }

  // central directory structure
  // TODO: handle the rest of the structures (Zip64 stuff)
  if (bstream.peekNumber(4) == zCentralFileHeaderSignature) {
    if (logToConsole) {
      info(' Found a Central File Header');
    }

    // read all file headers
    while (bstream.peekNumber(4) == zCentralFileHeaderSignature) {
      bstream.readNumber(4); // signature
      const cdfh = {
        versionMadeBy: bstream.readNumber(2),
        versionNeededToExtract: bstream.readNumber(2),
        generalPurposeBitFlag: bstream.readNumber(2),
        compressionMethod: bstream.readNumber(2),
        lastModFileTime: bstream.readNumber(2),
        lastModFileDate: bstream.readNumber(2),
        crc32: bstream.readNumber(4),
        compressedSize: bstream.readNumber(4),
        uncompressedSize: bstream.readNumber(4),
        fileNameLength: bstream.readNumber(2),
        extraFieldLength: bstream.readNumber(2),
        fileCommentLength: bstream.readNumber(2),
        diskNumberStart: bstream.readNumber(2),
        internalFileAttributes: bstream.readNumber(2),
        externalFileAttributes: bstream.readNumber(4),
        relativeOffset: bstream.readNumber(4),
      };
      cdfh.fileName = bstream.readString(cdfh.fileNameLength);
      cdfh.extraField = bstream.readString(cdfh.extraFieldLength);
      cdfh.fileComment = bstream.readString(cdfh.fileCommentLength);
      if (logToConsole) {
        console.log('Central Directory File Header:');
        for (const field in cdfh) {
          console.log(`  ${field} = ${cdfh[field]}`);
        }
      }
    }
  }

  // digital signature
  if (bstream.peekNumber(4) == zDigitalSignatureSignature) {
    if (logToConsole) {
      info(' Found a Digital Signature');
    }

    bstream.readNumber(4);
    const sizeOfSignature = bstream.readNumber(2);
    bstream.readString(sizeOfSignature); // digital signature data
  }

  let metadata = {};
  if (bstream.peekNumber(4) == zEndOfCentralDirSignature) {
    bstream.readNumber(4); // signature
    const eocds = {
      numberOfThisDisk: bstream.readNumber(2),
      diskWhereCentralDirectoryStarts: bstream.readNumber(2),
      numberOfCentralDirectoryRecordsOnThisDisk: bstream.readNumber(2),
      totalNumberOfCentralDirectoryRecords: bstream.readNumber(2),
      sizeOfCentralDirectory: bstream.readNumber(4),
      offsetOfStartOfCentralDirectory: bstream.readNumber(4),
      commentLength: bstream.readNumber(2),
    };
    eocds.comment = bstream.readString(eocds.commentLength);
    if (logToConsole) {
      console.log('End of Central Dir Signature:');
      for (const field in eocds) {
        console.log(`  ${field} = ${eocds[field]}`);
      }
    }
    metadata.comment = eocds.comment;
  }

  postProgress();

  bytestream = bstream.tee();

  unarchiveState = UnarchiveState.FINISHED;
  postMessage({ type: 'finish', metadata });
}

// event.data.file has the first ArrayBuffer.
// event.data.bytes has all subsequent ArrayBuffers.
onmessage = function (event) {
  const bytes = event.data.file || event.data.bytes;
  logToConsole = !!event.data.logToConsole;

  // This is the very first time we have been called. Initialize the bytestream.
  if (!bytestream) {
    bytestream = new bitjs.io.ByteStream(bytes);
  } else {
    bytestream.push(bytes);
  }

  if (unarchiveState === UnarchiveState.NOT_STARTED) {
    currentFilename = '';
    currentFileNumber = 0;
    currentBytesUnarchivedInFile = 0;
    currentBytesUnarchived = 0;
    totalUncompressedBytesInArchive = 0;
    totalFilesInArchive = 0;
    currentBytesUnarchived = 0;
    allLocalFiles = [];

    postMessage({ type: 'start' });

    unarchiveState = UnarchiveState.UNARCHIVING;

    postProgress();
  }

  if (unarchiveState === UnarchiveState.UNARCHIVING ||
    unarchiveState === UnarchiveState.WAITING) {
    try {
      archiveUnzip();
    } catch (e) {
      if (typeof e === 'string' && e.startsWith('Error!  Overflowed')) {
        // Overrun the buffer.
        unarchiveState = UnarchiveState.WAITING;
      } else {
        console.error('Found an error while unzipping');
        console.dir(e);
        throw e;
      }
    }
  }
};
