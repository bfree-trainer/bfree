// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');

export function getElapsedTimeStr(t: number) {
	const min = Math.floor(t / 60000);
	const sec = Math.floor((t % (1000 * 60)) / 1000);

	return `${zeroPad(min, 2)}:${zeroPad(sec, 2)}`;
}

/** Format milliseconds as "Xh Ym", "Xh", "Ym", or "0m". */
export function formatDuration(ms: number): string {
	const totalMin = Math.round(ms / 60000);
	const hours = Math.floor(totalMin / 60);
	const minutes = totalMin % 60;
	if (hours === 0 && minutes === 0) return '0m';
	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}h`;
	return `${hours}h ${minutes}m`;
}
