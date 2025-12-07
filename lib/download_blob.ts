// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

export default function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');

	a.href = url;
	a.download = filename;

	const clickHandler = () => {
		setTimeout(() => {
			URL.revokeObjectURL(url);
			a.removeEventListener('click', clickHandler);
		}, 150);
	};

	a.addEventListener('click', clickHandler, false);
	a.click();

	return a;
}
