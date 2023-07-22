/**
 * @param {ArrayBuffer|Uint8Array} webpBuffer The byte array containing the WebP image bytes.
 * @returns {Promise<ArrayBuffer>} A Promise resolving to a byte array containing the PNG bytes.
 */
export function convertWebPtoPNG(webpBuffer: ArrayBuffer | Uint8Array): Promise<ArrayBuffer>;
/**
 * @param {ArrayBuffer|Uint8Array} webpBuffer The byte array containing the WebP image bytes.
 * @returns {Promise<ArrayBuffer>} A Promise resolving to a byte array containing the JPG bytes.
 */
export function convertWebPtoJPG(webpBuffer: ArrayBuffer | Uint8Array): Promise<ArrayBuffer>;
//# sourceMappingURL=webp-shim.d.ts.map