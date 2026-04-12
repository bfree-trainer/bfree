// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Returns true if the filename indicates a gzip-compressed file (ends with `.gz`).
 */
export function isGzipFile(filename: string): boolean {
	return filename.toLowerCase().endsWith('.gz');
}

/**
 * Decompress a gzip-compressed ArrayBuffer using the browser's
 * built-in Compression Streams API.
 *
 * Throws if the input is not valid gzip data or if the stream fails.
 * Callers should handle rejection (e.g., show an error to the user).
 */
export async function decompressGzip(compressed: ArrayBuffer): Promise<ArrayBuffer> {
	const ds = new DecompressionStream('gzip');
	const stream = new Blob([compressed]).stream().pipeThrough(ds);
	return new Response(stream).arrayBuffer();
}
