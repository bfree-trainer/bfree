// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');

export function getElapsedTimeStr(t: number) {
	const totalSec = Math.floor(t / 1000);
	const hours = Math.floor(totalSec / 3600);
	const min = Math.floor((totalSec % 3600) / 60);
	const sec = totalSec % 60;

	if (hours > 0) {
		return `${hours}:${zeroPad(min, 2)}:${zeroPad(sec, 2)}`;
	}
	return `${zeroPad(min, 2)}:${zeroPad(sec, 2)}`;
}

/** Format milliseconds as "Xh Ym", "Xh", "Ym", or "0m". Negative values are treated as 0. */
export function formatDuration(ms: number): string {
	const totalMin = Math.round(Math.max(0, ms) / 60000);
	const hours = Math.floor(totalMin / 60);
	const minutes = totalMin % 60;
	if (hours === 0 && minutes === 0) return '0m';
	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}h`;
	return `${hours}h ${minutes}m`;
}
