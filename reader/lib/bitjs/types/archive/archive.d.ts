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
export function getUnarchiver(ab: ArrayBuffer, options?: any | string): Unarchiver;
export class Unzipper extends UnzipperInternal {
    constructor(ab: any, options: any);
}
export class Unrarrer extends UnrarrerInternal {
    constructor(ab: any, options: any);
}
export class Untarrer extends UntarrerInternal {
    constructor(ab: any, options: any);
}
export type UnarchivedFile = {
    filename: string;
    fileData: Uint8Array;
};
import { Unarchiver } from "./decompress-internal.js";
import { UnarchiveAppendEvent } from "./decompress-internal.js";
import { UnarchiveErrorEvent } from "./decompress-internal.js";
import { UnarchiveEvent } from "./decompress-internal.js";
import { UnarchiveEventType } from "./decompress-internal.js";
import { UnarchiveExtractEvent } from "./decompress-internal.js";
import { UnarchiveFinishEvent } from "./decompress-internal.js";
import { UnarchiveInfoEvent } from "./decompress-internal.js";
import { UnarchiveProgressEvent } from "./decompress-internal.js";
import { UnarchiveStartEvent } from "./decompress-internal.js";
import { UnzipperInternal } from "./decompress-internal.js";
import { UnrarrerInternal } from "./decompress-internal.js";
import { UntarrerInternal } from "./decompress-internal.js";
export { UnarchiveAppendEvent, UnarchiveErrorEvent, UnarchiveEvent, UnarchiveEventType, UnarchiveExtractEvent, UnarchiveFinishEvent, UnarchiveInfoEvent, UnarchiveProgressEvent, UnarchiveStartEvent, Unarchiver };
//# sourceMappingURL=archive.d.ts.map