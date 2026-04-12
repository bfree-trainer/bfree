// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Parse a TCX (Training Center XML) file and return the XML Document.
 */
export async function parseTcxFile(file: File): Promise<Document> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(e.target.result as string, 'text/xml');
			const errorNode = xmlDoc.querySelector('parsererror');
			if (errorNode) {
				reject(new Error('Failed to parse the TCX file'));
			} else {
				resolve(xmlDoc);
			}
		};
		reader.onerror = () => reject(new Error('Failed to read the TCX file'));
		reader.readAsText(file);
	});
}
