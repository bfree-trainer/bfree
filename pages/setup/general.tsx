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

const gen = (uc: UnitConv): [string, string][] => Object.keys(uc).map((k) => [k, uc[k].name]);
const speedUnits: [string, string][] = gen(speedUnitConv);
const distanceUnits: [string, string][] = gen(distanceUnitConv).filter((v) => ['m', 'km', 'yd', 'mi'].includes(v[0]));

export default function SetupGeneral() {
	return (
		<Container maxWidth="md">
			<MyHead title="General" />
			<Box>
				<Title href="/setup">General</Title>
				<p>Configure measurement units and UX settings.</p>

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
					<BooleanConfigParam
						title="Ride"
						image="/images/cards/road.jpg"
						label="Lap resets aggregated values"
						configName="lapResetsAgg"
					/>
				</Grid>
			</Box>
		</Container>
	);
}
