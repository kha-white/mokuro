/**
 * archive.js
 *
 * Provides base functionality for unarchiving.
 * DEPRECATED: Use decompress.js instead.
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2011 Google Inc.
 */

import { UnarchiveAppendEvent, UnarchiveErrorEvent, UnarchiveEvent, UnarchiveEventType,
         UnarchiveExtractEvent, UnarchiveFinishEvent, UnarchiveInfoEvent,
         UnarchiveProgressEvent, UnarchiveStartEvent, Unarchiver,
         UnrarrerInternal, UntarrerInternal, UnzipperInternal,
         getUnarchiverInternal } from './decompress-internal.js';

export {
  UnarchiveAppendEvent,
  UnarchiveErrorEvent,
  UnarchiveEvent,
  UnarchiveEventType,
  UnarchiveExtractEvent,
  UnarchiveFinishEvent,
  UnarchiveInfoEvent,
  UnarchiveProgressEvent,
  UnarchiveStartEvent,
  Unarchiver,
} 

/**
 * All extracted files returned by an Unarchiver will implement
 * the following interface:
 */

/**
 * @typedef UnarchivedFile
 * @property {string} filename
 * @property {Uint8Array} fileData
 */

/**
 * The goal is to make this testable - send getUnarchiver() an array buffer of
 * an archive, call start on the unarchiver, expect the returned result.
 *
 * Problem: It relies on Web Workers, and that won't work in a nodejs context.
 * Solution: Make archive.js very thin, have it feed web-specific things into
 *           an internal module that is isomorphic JavaScript.
 *
 * TODO:
 * - write unit tests for archive-internal.js that use the nodejs Worker
 *   equivalent.
 * - maybe use @pgriess/node-webworker or @audreyt/node-webworker-threads or
 *   just node's worker_threads ?
 */

const createWorkerFn = (scriptFilename) => new Worker(scriptFilename, { type: "module" });

function warn() {
  console.warn(`Stop using archive.js and use decompress.js instead. This module will be removed.`);
}

// Thin wrappers of unarchivers for clients who want to construct a specific
// unarchiver themselves rather than use getUnarchiver().
export class Unzipper extends UnzipperInternal {
  constructor(ab, options) { warn(); super(ab, createWorkerFn, options); }
}

export class Unrarrer extends UnrarrerInternal {
  constructor(ab, options) { warn(); super(ab, createWorkerFn, options); }
}

export class Untarrer extends UntarrerInternal {
  constructor(ab, options) { warn(); super(ab, createWorkerFn, options); }
}

/**
 * Factory method that creates an unarchiver based on the byte signature found
 * in the arrayBuffer.
 * @param {ArrayBuffer} ab The ArrayBuffer to unarchive. Note that this ArrayBuffer
 *     must not be referenced after calling this method, as the ArrayBuffer is marked
 *     as Transferable and sent to a Worker thread once start() is called.
 * @param {Object|string} options An optional object of options, or a string
 *     representing where the path to the unarchiver script files.
 * @returns {Unarchiver}
 */
export function getUnarchiver(ab, options = {}) {
  warn();
  return getUnarchiverInternal(ab, createWorkerFn, options);
}
