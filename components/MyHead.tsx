// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Head from 'next/head';

export default function MyHead({ title }) {
	return (
		<Head>
			<title>{`Bfree ${title}`}</title>
			<link rel="icon" href="/favicon.ico" />
		</Head>
	);
}
