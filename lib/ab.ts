// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

export function arrayBufferToString(buffer: ArrayBuffer, encoding: string): Promise<string> {
	return new Promise((resolve) => {
		const blob = new Blob([buffer], { type: 'text/plain' });
		const reader = new FileReader();

		reader.onload = (e) => resolve(e.target.result as string);
		reader.readAsText(blob, encoding);
	});
}

export function stringToArrayBuffer(str: string, encoding: string): Promise<ArrayBuffer> {
	return new Promise((resolve) => {
		const blob = new Blob([str], { type: `text/plain;charset=${encoding}` });
		const reader = new FileReader();

		reader.onload = (evt) => resolve(evt.target.result as ArrayBuffer);
		reader.readAsArrayBuffer(blob);
	});
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
	if (typeof window === 'undefined') {
		return Buffer.from(buf).toString('base64');
	} else {
		// "Uncaught RangeError: Maximum call stack size exceeded"
		//return window.btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
		// The following version should work for longer inputs, util it doesn't
		return window.btoa(
			new Uint8Array(buf).reduce(function (data, byte) {
				return data + String.fromCharCode(byte);
			}, '')
		);
	}
}

export function base64ToString(str: string): string {
	if (typeof window === 'undefined') {
		return Buffer.from(str, 'base64').toString();
	} else {
		return window.atob(str);
	}
}

export async function stringToBase64(str: string): Promise<string> {
	if (typeof window === 'undefined') {
		return Buffer.from(str).toString('base64');
	} else {
		const buf = await stringToArrayBuffer(str, 'utf-8');

		return arrayBufferToBase64(buf);
	}
}

export async function digestSHA1(str: string): Promise<string> {
	const data = await stringToArrayBuffer(str, 'utf-8');
	const digest = await crypto.subtle.digest('SHA-1', data);

	return arrayBufferToBase64(digest);
}
