/**
 * decompress-internal.js
 *
 * Provides base functionality for unarchiving, extracted here as an internal
 * module for unit testing. Import decompress.js instead.
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2021 Google Inc.
 */

import { findMimeType } from '../file/sniffer.js';

/**
 * @typedef UnarchivedFile
 * @property {string} filename
 * @property {Uint8Array} fileData
 */

/**
 * The UnarchiveEvent types.
 */
export const UnarchiveEventType = {
  START: 'start',
  APPEND: 'append',
  PROGRESS: 'progress',
  EXTRACT: 'extract',
  FINISH: 'finish',
  INFO: 'info',
  ERROR: 'error'
};

/**
 * An unarchive event.
 */
 export class UnarchiveEvent {
  /**
   * @param {string} type The event type.
   */
  constructor(type) {
    /**
     * The event type.
     * @type {string}
     */
    this.type = type;
  }
}

/**
 * Updates all Archiver listeners that an append has occurred.
 */
 export class UnarchiveAppendEvent extends UnarchiveEvent {
  /**
   * @param {number} numBytes The number of bytes appended.
   */
  constructor(numBytes) {
    super(UnarchiveEventType.APPEND);

    /**
     * The number of appended bytes.
     * @type {number}
     */
    this.numBytes = numBytes;
  }
}

/**
 * Useful for passing info up to the client (for debugging).
 */
export class UnarchiveInfoEvent extends UnarchiveEvent {
  /**
   * @param {string} msg The info message.
   */
  constructor(msg) {
    super(UnarchiveEventType.INFO);

    /**
     * The information message.
     * @type {string}
     */
    this.msg = msg;
  }
}

/**
 * An unrecoverable error has occured.
 */
export class UnarchiveErrorEvent extends UnarchiveEvent {
  /**
   * @param {string} msg The error message.
   */
  constructor(msg) {
    super(UnarchiveEventType.ERROR);

    /**
     * The information message.
     * @type {string}
     */
    this.msg = msg;
  }
}

/**
 * Start event.
 */
export class UnarchiveStartEvent extends UnarchiveEvent {
  constructor() {
    super(UnarchiveEventType.START);
  }
}

/**
 * Finish event.
 */
export class UnarchiveFinishEvent extends UnarchiveEvent {
  /**
   * @param {Object} metadata A collection fo metadata about the archive file.
   */
  constructor(metadata = {}) {
    super(UnarchiveEventType.FINISH);
    this.metadata = metadata;
  }
}

/**
 * Progress event.
 */
export class UnarchiveProgressEvent extends UnarchiveEvent {
  /**
   * @param {string} currentFilename
   * @param {number} currentFileNumber
   * @param {number} currentBytesUnarchivedInFile
   * @param {number} currentBytesUnarchived
   * @param {number} totalUncompressedBytesInArchive
   * @param {number} totalFilesInArchive
   * @param {number} totalCompressedBytesRead
   */
  constructor(currentFilename, currentFileNumber, currentBytesUnarchivedInFile,
    currentBytesUnarchived, totalUncompressedBytesInArchive, totalFilesInArchive,
    totalCompressedBytesRead) {
    super(UnarchiveEventType.PROGRESS);

    this.currentFilename = currentFilename;
    this.currentFileNumber = currentFileNumber;
    this.currentBytesUnarchivedInFile = currentBytesUnarchivedInFile;
    this.totalFilesInArchive = totalFilesInArchive;
    this.currentBytesUnarchived = currentBytesUnarchived;
    this.totalUncompressedBytesInArchive = totalUncompressedBytesInArchive;
    this.totalCompressedBytesRead = totalCompressedBytesRead;
  }
}

/**
 * Extract event.
 */
export class UnarchiveExtractEvent extends UnarchiveEvent {
  /**
   * @param {UnarchivedFile} unarchivedFile
   */
  constructor(unarchivedFile) {
    super(UnarchiveEventType.EXTRACT);

    /**
     * @type {UnarchivedFile}
     */
    this.unarchivedFile = unarchivedFile;
  }
}

/**
 * Base class for all Unarchivers.
 * TODO: When EventTarget constructors are broadly supported, make this extend
 *     EventTarget and remove event listener code.
 *     https://caniuse.com/#feat=mdn-api_eventtarget_eventtarget
 */
 export class Unarchiver {
  /**
   * @param {ArrayBuffer} arrayBuffer The Array Buffer. Note that this ArrayBuffer must not be
   *     referenced once it is sent to the Unarchiver, since it is marked as Transferable and sent
   *     to the Worker.
   * @param {Function(string):Worker} createWorkerFn A function that creates a Worker from a script file.
   * @param {Object|string} options An optional object of options, or a string representing where
   *     the BitJS files are located.  The string version of this argument is deprecated.
   *     Available options:
   *       'pathToBitJS': A string indicating where the BitJS files are located.
   *       'debug': A boolean where true indicates that the archivers should log debug output.
   */
  constructor(arrayBuffer, createWorkerFn, options = {}) {
    if (typeof options === 'string') {
      console.warn(`Deprecated: Don't send a raw string to Unarchiver()`);
      console.warn(`            send {'pathToBitJS':'${options}'} instead`);
      options = { 'pathToBitJS': options };
    }

    /**
     * The ArrayBuffer object.
     * @type {ArrayBuffer}
     * @protected
     */
    this.ab = arrayBuffer;

    /**
     * A factory method that creates a Worker that does the unarchive work.
     * @type {Function(string): Worker}
     * @private
     */
    this.createWorkerFn_ = createWorkerFn;

    /**
     * The path to the BitJS files.
     * @type {string}
     * @private
     */
    this.pathToBitJS_ = options.pathToBitJS || '/';

    /**
     * @orivate
     * @type {boolean}
     */
    this.debugMode_ = !!(options.debug);

    /**
     * A map from event type to an array of listeners.
     * @private
     * @type {Map.<string, Array>}
     */
    this.listeners_ = {};
    for (let type in UnarchiveEventType) {
      this.listeners_[UnarchiveEventType[type]] = [];
    }

    /**
     * Private web worker initialized during start().
     * @private
     * @type {Worker}
     */
    this.worker_ = null;
  }

  /**
   * This method must be overridden by the subclass to return the script filename.
   * @returns {string} The MIME type of the archive.
   * @protected.
   */
  getMIMEType() {
    throw 'Subclasses of Unarchiver must overload getMIMEType()';
  }

  /**
   * This method must be overridden by the subclass to return the script filename.
   * @returns {string} The script filename.
   * @protected.
   */
  getScriptFileName() {
    throw 'Subclasses of Unarchiver must overload getScriptFileName()';
  }

  /**
   * Adds an event listener for UnarchiveEvents.
   *
   * @param {string} Event type.
   * @param {function} An event handler function.
   */
  addEventListener(type, listener) {
    if (type in this.listeners_) {
      if (this.listeners_[type].indexOf(listener) == -1) {
        this.listeners_[type].push(listener);
      }
    }
  }

  /**
   * Removes an event listener.
   *
   * @param {string} Event type.
   * @param {EventListener|function} An event listener or handler function.
   */
  removeEventListener(type, listener) {
    if (type in this.listeners_) {
      const index = this.listeners_[type].indexOf(listener);
      if (index != -1) {
        this.listeners_[type].splice(index, 1);
      }
    }
  }

  /**
   * Create an UnarchiveEvent out of the object sent back from the Worker.
   * @param {Object} obj
   * @returns {UnarchiveEvent}
   * @private
   */
  createUnarchiveEvent_(obj) {
    switch (obj.type) {
      case UnarchiveEventType.START:
        return new UnarchiveStartEvent();
      case UnarchiveEventType.PROGRESS:
        return new UnarchiveProgressEvent(
          obj.currentFilename,
          obj.currentFileNumber,
          obj.currentBytesUnarchivedInFile,
          obj.currentBytesUnarchived,
          obj.totalUncompressedBytesInArchive,
          obj.totalFilesInArchive,
          obj.totalCompressedBytesRead);
      case UnarchiveEventType.EXTRACT:
        return new UnarchiveExtractEvent(obj.unarchivedFile);
      case UnarchiveEventType.FINISH:
        return new UnarchiveFinishEvent(obj.metadata);
      case UnarchiveEventType.INFO:
        return new UnarchiveInfoEvent(obj.msg);
      case UnarchiveEventType.ERROR:
        return new UnarchiveErrorEvent(obj.msg);
    }
  }

  /**
   * Receive an event and pass it to the listener functions.
   *
   * @param {Object} obj
   * @private
   */
  handleWorkerEvent_(obj) {
    const type = obj.type;
    if (type && Object.values(UnarchiveEventType).includes(type) &&
      this.listeners_[obj.type] instanceof Array) {
      const evt = this.createUnarchiveEvent_(obj);
      this.listeners_[evt.type].forEach(function (listener) { listener(evt) });
      if (evt.type == UnarchiveEventType.FINISH) {
        this.worker_.terminate();
      }
    } else {
      console.log(`Unknown object received from worker: ${obj}`);
    }
  }

  /**
   * Starts the unarchive in a separate Web Worker thread and returns immediately.
   */
  start() {
    const me = this;
    const scriptFileName = this.pathToBitJS_ + this.getScriptFileName();
    if (scriptFileName) {
      this.worker_ = this.createWorkerFn_(scriptFileName);

      this.worker_.onerror = function (e) {
        console.log('Worker error: message = ' + e.message);
        throw e;
      };

      this.worker_.onmessage = function (e) {
        if (typeof e.data == 'string') {
          // Just log any strings the workers pump our way.
          console.log(e.data);
        } else {
          me.handleWorkerEvent_(e.data);
        }
      };

      const ab = this.ab;
      this.worker_.postMessage({
        file: ab,
        logToConsole: this.debugMode_,
      }, [ab]);
      this.ab = null;
    }
  }

  // TODO: Create a startSync() method that does not use a worker for Node.

  /**
   * Adds more bytes to the unarchiver's Worker thread.
   * @param {ArrayBuffer} ab The ArrayBuffer with more bytes in it. If opt_transferable is
   *     set to true, this ArrayBuffer must not be referenced after calling update(), since it
   *     is marked as Transferable and sent to the Worker.
   * @param {boolean=} opt_transferable Optional boolean whether to mark this ArrayBuffer
   *     as a Tranferable object, which means it can no longer be referenced outside of
   *     the Worker thread.
   */
  update(ab, opt_transferable = false) {
    const numBytes = ab.byteLength;
    if (this.worker_) {
      // Send the ArrayBuffer over, and mark it as a Transferable object if necessary.
      if (opt_transferable) {
        this.worker_.postMessage({ bytes: ab }, [ab]);
      } else {
        this.worker_.postMessage({ bytes: ab });
      }
    }
    if (this.listeners_[UnarchiveEventType.APPEND]) {
      const evt = new UnarchiveAppendEvent(numBytes);
      this.listeners_[UnarchiveEventType.APPEND].forEach(listener => listener(evt));
    }
  }

  /**
   * Terminates the Web Worker for this Unarchiver and returns immediately.
   */
  stop() {
    if (this.worker_) {
      this.worker_.terminate();
    }
  }
}

export class UnzipperInternal extends Unarchiver {
  constructor(arrayBuffer, createWorkerFn, options) {
    super(arrayBuffer, createWorkerFn, options);
  }

  getMIMEType() { return 'application/zip'; }
  getScriptFileName() { return 'archive/unzip.js'; }
}

export class UnrarrerInternal extends Unarchiver {
  constructor(arrayBuffer, createWorkerFn, options) {
    super(arrayBuffer, createWorkerFn, options);
  }

  getMIMEType() { return 'application/x-rar-compressed'; }
  getScriptFileName() { return 'archive/unrar.js'; }
}

export class UntarrerInternal extends Unarchiver {
  constructor(arrayBuffer, createWorkerFn, options) {
    super(arrayBuffer, createWorkerFn, options);
  }

  getMIMEType() { return 'application/x-tar'; }
  getScriptFileName() { return 'archive/untar.js'; };
}

/**
 * Factory method that creates an unarchiver based on the byte signature found
 * in the arrayBuffer.
 * @param {ArrayBuffer} ab
 * @param {Function(string):Worker} createWorkerFn A function that creates a Worker from a script file.
 * @param {Object|string} options An optional object of options, or a string representing where
 *     the path to the unarchiver script files.
 * @returns {Unarchiver}
 */
 export function getUnarchiverInternal(ab, createWorkerFn, options = {}) {
  if (ab.byteLength < 10) {
    return null;
  }

  let unarchiver = null;
  const mimeType = findMimeType(ab);

  if (mimeType === 'application/x-rar-compressed') { // Rar!
    unarchiver = new UnrarrerInternal(ab, createWorkerFn, options);
  } else if (mimeType === 'application/zip') { // PK (Zip)
    unarchiver = new UnzipperInternal(ab, createWorkerFn, options);
  } else { // Try with tar
    unarchiver = new UntarrerInternal(ab, createWorkerFn, options);
  }
  return unarchiver;
}
