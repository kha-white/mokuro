/**
 * File Sniffer.
 * Makes an attempt to resolve a byte stream into a MIME type.
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2020 Google Inc.
 */

// A selection from https://en.wikipedia.org/wiki/List_of_file_signatures.
// Mapping of MIME type to magic numbers.  Each file type can have multiple signatures.
// '??' is used as a placeholder value.
const fileSignatures = {
  // Document formats.
  'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  // Archive formats:
  'application/x-tar': [
    [0x75, 0x73, 0x74, 0x61, 0x72, 0x00, 0x30, 0x30],
    [0x75, 0x73, 0x74, 0x61, 0x72, 0x20, 0x20, 0x00],
  ],
  // Compressed archive formats.
  'application/x-7z-compressed': [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]],
  'application/x-bzip2': [[0x42, 0x5A, 0x68]],
  'application/x-rar-compressed': [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]],
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  // Image formats.
  'image/bmp': [[0x42, 0x4D]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, '??', '??', '??', '??', 0x57, 0x45, 0x42, 0x50]],
  // Audio/Video formats.
  'application/ogg': [[0x4F, 0x67, 0x67, 0x53]],
  'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]],
};

// TODO: Eventually add support for various container formats so that:
//   * an OGG container can be resolved to OGG Audio, OGG Video
//   * an HEIF container can be resolved to AVIF, HEIC

/**
 * Represents a single byte in the tree. If this node terminates a known MIME type (see magic
 * numbers above), then the mimeType field will be set.
 */
class Node {
  /** @type {string} */
  mimeType;

  /** @type {Object<number, Node>} */
  children = {};

  /** @param {number} value The byte that this Node points at. */
  constructor(value) {
    /** @type {number} */
    this.value = value;
  }
}

/** Top-level node in the byte tree. */
let root = null;
/** The maximum depth of the byte tree. */
let maxDepth = 0;

/**
 * This function initializes the byte tree. It is lazily called upon findMimeType(), but if you care
 * about when the tree initializes (like in startup, etc), you can call it yourself here.
 */
export function initialize() {
  root = new Node();

  // Construct the tree, erroring if overlapping mime types are possible.
  for (const mimeType in fileSignatures) {
    for (const signature of fileSignatures[mimeType]) {
      let curNode = root;
      let depth = 0;
      for (const byte of signature) {
        if (curNode.children[byte] === undefined) {
          if (byte === '??' && !curNode.children['??'] && Object.keys(curNode.children).length > 0) {
            throw 'Cannot add a placeholder child to a node that has non-placeholder children';
          } else if (byte !== '??' && curNode.children['??']) {
            throw 'Cannot add a non-placeholder child to a node that has a placeholder child';
          }
          curNode.children[byte] = new Node(byte);
        }
        depth++;
        curNode = curNode.children[byte];
      } // for each byte

      if (maxDepth < depth) {
        maxDepth = depth;
      }

      if (curNode.mimeType) {
        throw `File signature collision:  ${curNode.mimeType} overlaps with ${mimeType}`;
      } else if (Object.keys(curNode.children).length > 0) {
        throw `${mimeType} signature is not unique, it collides with other mime types`;
      }
      curNode.mimeType = mimeType;
    } // for each signature
  }
}

/**
 * Finds the likely MIME type represented by the ArrayBuffer.
 * @param {ArrayBuffer} ab
 * @returns {string} The MIME type of the buffer, or undefined.
 */
export function findMimeType(ab) {
  if (!root) {
    initialize();
  }

  const depth = ab.byteLength < maxDepth ? ab.byteLength : maxDepth;
  const arr = new Uint8Array(ab).subarray(0, depth);
  let curNode = root;
  // Step through bytes, updating curNode as it walks down the byte tree.
  for (const byte of arr) {
    // If this node has a placeholder child, just step into it.
    if (curNode.children['??']) {
      curNode = curNode.children['??'];
      continue;
    }
    if (curNode.children[byte] === undefined) return undefined;
    curNode = curNode.children[byte];
    if (curNode.mimeType) return curNode.mimeType;
  }
}
