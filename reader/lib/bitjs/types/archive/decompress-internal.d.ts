/**
 * Factory method that creates an unarchiver based on the byte signature found
 * in the arrayBuffer.
 * @param {ArrayBuffer} ab
 * @param {Function(string):Worker} createWorkerFn A function that creates a Worker from a script file.
 * @param {Object|string} options An optional object of options, or a string representing where
 *     the path to the unarchiver script files.
 * @returns {Unarchiver}
 */
export function getUnarchiverInternal(ab: ArrayBuffer, createWorkerFn: any, options?: any | string): Unarchiver;
export namespace UnarchiveEventType {
    const START: string;
    const APPEND: string;
    const PROGRESS: string;
    const EXTRACT: string;
    const FINISH: string;
    const INFO: string;
    const ERROR: string;
}
/**
 * An unarchive event.
 */
export class UnarchiveEvent {
    /**
     * @param {string} type The event type.
     */
    constructor(type: string);
    /**
     * The event type.
     * @type {string}
     */
    type: string;
}
/**
 * Updates all Archiver listeners that an append has occurred.
 */
export class UnarchiveAppendEvent extends UnarchiveEvent {
    /**
     * @param {number} numBytes The number of bytes appended.
     */
    constructor(numBytes: number);
    /**
     * The number of appended bytes.
     * @type {number}
     */
    numBytes: number;
}
/**
 * Useful for passing info up to the client (for debugging).
 */
export class UnarchiveInfoEvent extends UnarchiveEvent {
    /**
     * The information message.
     * @type {string}
     */
    msg: string;
}
/**
 * An unrecoverable error has occured.
 */
export class UnarchiveErrorEvent extends UnarchiveEvent {
    /**
     * The information message.
     * @type {string}
     */
    msg: string;
}
/**
 * Start event.
 */
export class UnarchiveStartEvent extends UnarchiveEvent {
    constructor();
}
/**
 * Finish event.
 */
export class UnarchiveFinishEvent extends UnarchiveEvent {
    /**
     * @param {Object} metadata A collection fo metadata about the archive file.
     */
    constructor(metadata?: any);
    metadata: any;
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
    constructor(currentFilename: string, currentFileNumber: number, currentBytesUnarchivedInFile: number, currentBytesUnarchived: number, totalUncompressedBytesInArchive: number, totalFilesInArchive: number, totalCompressedBytesRead: number);
    currentFilename: string;
    currentFileNumber: number;
    currentBytesUnarchivedInFile: number;
    totalFilesInArchive: number;
    currentBytesUnarchived: number;
    totalUncompressedBytesInArchive: number;
    totalCompressedBytesRead: number;
}
/**
 * Extract event.
 */
export class UnarchiveExtractEvent extends UnarchiveEvent {
    /**
     * @param {UnarchivedFile} unarchivedFile
     */
    constructor(unarchivedFile: UnarchivedFile);
    /**
     * @type {UnarchivedFile}
     */
    unarchivedFile: UnarchivedFile;
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
    constructor(arrayBuffer: ArrayBuffer, createWorkerFn: any, options?: any | string);
    /**
     * The ArrayBuffer object.
     * @type {ArrayBuffer}
     * @protected
     */
    protected ab: ArrayBuffer;
    /**
     * A factory method that creates a Worker that does the unarchive work.
     * @type {Function(string): Worker}
     * @private
     */
    private createWorkerFn_;
    /**
     * The path to the BitJS files.
     * @type {string}
     * @private
     */
    private pathToBitJS_;
    /**
     * @orivate
     * @type {boolean}
     */
    debugMode_: boolean;
    /**
     * A map from event type to an array of listeners.
     * @private
     * @type {Map.<string, Array>}
     */
    private listeners_;
    /**
     * Private web worker initialized during start().
     * @private
     * @type {Worker}
     */
    private worker_;
    /**
     * This method must be overridden by the subclass to return the script filename.
     * @returns {string} The MIME type of the archive.
     * @protected.
     */
    protected getMIMEType(): string;
    /**
     * This method must be overridden by the subclass to return the script filename.
     * @returns {string} The script filename.
     * @protected.
     */
    protected getScriptFileName(): string;
    /**
     * Adds an event listener for UnarchiveEvents.
     *
     * @param {string} Event type.
     * @param {function} An event handler function.
     */
    addEventListener(type: any, listener: any): void;
    /**
     * Removes an event listener.
     *
     * @param {string} Event type.
     * @param {EventListener|function} An event listener or handler function.
     */
    removeEventListener(type: any, listener: any): void;
    /**
     * Create an UnarchiveEvent out of the object sent back from the Worker.
     * @param {Object} obj
     * @returns {UnarchiveEvent}
     * @private
     */
    private createUnarchiveEvent_;
    /**
     * Receive an event and pass it to the listener functions.
     *
     * @param {Object} obj
     * @private
     */
    private handleWorkerEvent_;
    /**
     * Starts the unarchive in a separate Web Worker thread and returns immediately.
     */
    start(): void;
    /**
     * Adds more bytes to the unarchiver's Worker thread.
     * @param {ArrayBuffer} ab The ArrayBuffer with more bytes in it. If opt_transferable is
     *     set to true, this ArrayBuffer must not be referenced after calling update(), since it
     *     is marked as Transferable and sent to the Worker.
     * @param {boolean=} opt_transferable Optional boolean whether to mark this ArrayBuffer
     *     as a Tranferable object, which means it can no longer be referenced outside of
     *     the Worker thread.
     */
    update(ab: ArrayBuffer, opt_transferable?: boolean | undefined): void;
    /**
     * Terminates the Web Worker for this Unarchiver and returns immediately.
     */
    stop(): void;
}
export class UnzipperInternal extends Unarchiver {
    constructor(arrayBuffer: any, createWorkerFn: any, options: any);
}
export class UnrarrerInternal extends Unarchiver {
    constructor(arrayBuffer: any, createWorkerFn: any, options: any);
}
export class UntarrerInternal extends Unarchiver {
    constructor(arrayBuffer: any, createWorkerFn: any, options: any);
}
export type UnarchivedFile = {
    filename: string;
    fileData: Uint8Array;
};
//# sourceMappingURL=decompress-internal.d.ts.map