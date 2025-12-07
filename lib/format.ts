// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');

export function getElapsedTimeStr(t: number) {
	const min = Math.floor(t / 60000);
	const sec = Math.floor((t % (1000 * 60)) / 1000);

	return `${zeroPad(min, 2)}:${zeroPad(sec, 2)}`;
}
