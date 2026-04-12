// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { decompressGzip, isGzipFile } from './decompress';

/**
 * Parse a TCX (Training Center XML) file and return the XML Document.
 * Supports gzip-compressed files (`.tcx.gz`).
 */
export async function parseTcxFile(file: File): Promise<Document> {
	let text: string;
	if (isGzipFile(file.name)) {
		const compressed = await file.arrayBuffer();
		const decompressed = await decompressGzip(compressed);
		text = new TextDecoder().decode(decompressed);
	} else {
		text = await file.text();
	}
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(text, 'text/xml');
	const errorNode = xmlDoc.querySelector('parsererror');
	if (errorNode) {
		throw new Error('Failed to parse the TCX file');
	}
	return xmlDoc;
}
