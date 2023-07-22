/**
 * This function initializes the byte tree. It is lazily called upon findMimeType(), but if you care
 * about when the tree initializes (like in startup, etc), you can call it yourself here.
 */
export function initialize(): void;
/**
 * Finds the likely MIME type represented by the ArrayBuffer.
 * @param {ArrayBuffer} ab
 * @returns {string} The MIME type of the buffer, or undefined.
 */
export function findMimeType(ab: ArrayBuffer): string;
//# sourceMappingURL=sniffer.d.ts.map