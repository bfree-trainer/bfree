
// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later
//
import { decompressGzip, isGzipFile } from './decompress';

/**
 * Parse XML string into a Document.
 * This function can be used to parse both GPX and TCX documents.
 */
export function parseXmlText(text: string): Document {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(text.trim(), 'text/xml');
	const errorNode = xmlDoc.querySelector('parsererror');
	if (errorNode) {
		throw new Error('Failed to parse the XML data');
	}
	return xmlDoc;
}

/**
 * Parse XML file into a Document.
 * This function can be used to parse both GPX and TCX documents.
 */
export async function parseXmlFile(file: File): Promise<Document> {
	let text: string;
	if (isGzipFile(file.name)) {
		const compressed = await file.arrayBuffer();
		const decompressed = await decompressGzip(compressed);
		text = new TextDecoder().decode(decompressed);
	} else {
		text = await file.text();
	}

	return parseXmlText(text);
}
