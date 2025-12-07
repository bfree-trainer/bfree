// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

class Defer<T> extends Promise<T> {
	resolve: (value: unknown) => void;
	reject: (reason?: any) => void;
}

export default function defer<T>(): Defer<T> {
	let res;
	let rej;
	const promise = new Defer<T>((resolve, reject) => {
		res = resolve;
		rej = reject;
	});

	promise.resolve = res;
	promise.reject = rej;

	return promise;
}
