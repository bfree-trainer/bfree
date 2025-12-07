// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

export function isValidUnsigned(value) {
	if (Number.isNaN(value)) {
		return false;
	}
	if (value <= 0) {
		return false;
	}
	return true;
}
