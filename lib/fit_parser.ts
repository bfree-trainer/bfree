// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import FitParser from 'fit-file-parser';

/** The full parsed FIT object returned by fit-file-parser in list mode. */
export type ParsedFit = Awaited<ReturnType<FitParser['parseAsync']>>;

/** A single data record from a FIT file (timestamp + metrics per second). */
export type ParsedRecord = NonNullable<ParsedFit['records']>[number];

/** A session summary from a FIT file. */
export type ParsedSession = NonNullable<ParsedFit['sessions']>[number];

/**
 * Parse a FIT binary file and return the parsed data in list mode.
 * Records, sessions, and laps are available as flat arrays on the returned object.
 */
export async function parseFitFile(file: File): Promise<ParsedFit> {
	const arrayBuffer = await file.arrayBuffer();
	const fitParser = new FitParser({
		force: true,
		speedUnit: 'm/s',
		lengthUnit: 'm',
		temperatureUnit: 'celsius',
		mode: 'list',
	});
	return fitParser.parseAsync(arrayBuffer);
}
