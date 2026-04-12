// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getGlobalState } from './global';

export function getClientLang(): string {
	if (typeof Intl !== 'undefined') {
		try {
			return Intl.NumberFormat().resolvedOptions().locale;
		} catch (_err) {
			if (window.navigator.languages) {
				// @ts-ignore
				return window.navigator.languages[0];
			} else {
				// @ts-ignore
				return window.navigator.userLanguage || window.navigator.language;
			}
		}
	}

	return 'en-US';
}

/**
 * Returns the effective locale for date formatting.
 * Uses the user-configured dateLocale if set, otherwise falls back to the
 * browser's detected locale.
 */
export function getConfiguredDateLocale(): string {
	if (typeof window !== 'undefined') {
		const configured = getGlobalState('dateLocale');
		if (configured) return configured;
	}
	return getClientLang();
}

/**
 * Format a date using the configured locale and the given Intl options.
 * Falls back to ISO string on the server side.
 */
export function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
	const d = date instanceof Date ? date : new Date(date);
	if (typeof window === 'undefined') return d.toISOString();
	return new Intl.DateTimeFormat(getConfiguredDateLocale(), options).format(d);
}

/** Format a full date with weekday, e.g. "Monday, April 12, 2026". */
export function formatLongDate(date: Date | number): string {
	return formatDate(date, {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/** Format a short week label, e.g. "Apr 7". */
export function formatWeekLabel(date: Date | number): string {
	return formatDate(date, { month: 'short', day: 'numeric' });
}

/** Format a month/year label, e.g. "Apr '25". */
export function formatMonthLabel(date: Date | number): string {
	return formatDate(date, { month: 'short', year: '2-digit' });
}

export function getDayPeriod(date: Date): string {
	return new Intl.DateTimeFormat(getConfiguredDateLocale(), { dayPeriod: 'short' }).format(date);
}
