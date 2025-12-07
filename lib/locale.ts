// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

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

export function getDayPeriod(date: Date): string {
	return new Intl.DateTimeFormat(getClientLang(), { dayPeriod: 'short' }).format(date);
}
