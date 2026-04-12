// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import { BooleanConfigParam, EnumConfigParam, UnsignedConfigParam } from 'components/SetupComponents';
import { UnitConv, distanceUnitConv, speedUnitConv } from 'lib/units';
import { getClientLang } from 'lib/locale';
import Typography from '@mui/material/Typography';

const gen = (uc: UnitConv): [string, string][] => Object.keys(uc).map((k) => [k, uc[k].name]);
const speedUnits: [string, string][] = gen(speedUnitConv);
const distanceUnits: [string, string][] = gen(distanceUnitConv).filter((v) => ['m', 'km', 'yd', 'mi'].includes(v[0]));

/**
 * A curated list of [BCP-47 locale tag, human-readable label] pairs.
 * The empty string entry means "use the browser's detected locale".
 */
function getDateLocaleOptions(): [string, string][] {
	const browserLocale = typeof window !== 'undefined' ? getClientLang() : 'en-US';
	return [
		['', `Browser default (${browserLocale})`],
		['en-US', 'English (US) — MM/DD/YYYY'],
		['en-GB', 'English (UK) — DD/MM/YYYY'],
		['de-DE', 'Deutsch (Deutschland)'],
		['fr-FR', 'Français (France)'],
		['es-ES', 'Español (España)'],
		['it-IT', 'Italiano (Italia)'],
		['pt-BR', 'Português (Brasil)'],
		['nl-NL', 'Nederlands (Nederland)'],
		['sv-SE', 'Svenska (Sverige)'],
		['fi-FI', 'Suomi (Suomi)'],
		['nb-NO', 'Norsk bokmål (Norge)'],
		['da-DK', 'Dansk (Danmark)'],
		['pl-PL', 'Polski (Polska)'],
		['ru-RU', 'Русский (Россия)'],
		['ja-JP', '日本語 (日本)'],
		['zh-CN', '中文 (中国大陆)'],
		['ko-KR', '한국어 (대한민국)'],
	];
}

export default function SetupGeneral() {
	const dateLocaleOptions = getDateLocaleOptions();

	return (
		<Container maxWidth="md">
			<MyHead title="General" />
			<Box>
				<Title href="/setup">General</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Configure measurement units and UX settings.
				</Typography>

				<Grid container direction="row" alignItems="flex-start" spacing={2}>
					<UnsignedConfigParam
						title="Sampling Rate"
						image="/images/cards/tic_tac.jpg"
						unit="Hz"
						configName="samplingRate"
					/>
					<EnumConfigParam
						title="Speed"
						image="/images/cards/limit.jpg"
						idPrefix="speed-unit"
						items={speedUnits}
						configName="unitSpeed"
					/>
					<EnumConfigParam
						title="Distance"
						image="/images/cards/road.jpg"
						idPrefix="distance-unit"
						items={distanceUnits}
						configName="unitDistance"
					/>
					<EnumConfigParam
						title="Date Format"
						image="/images/cards/misc.jpg"
						idPrefix="date-locale"
						label="Locale"
						helpLabel="Controls how dates are displayed across the app."
						items={dateLocaleOptions}
						configName="dateLocale"
					/>
					<BooleanConfigParam
						title="Misc"
						image="/images/cards/misc.jpg"
						label="Lap resets aggregated values"
						configName="lapResetsAgg"
					/>
				</Grid>
			</Box>
		</Container>
	);
}
