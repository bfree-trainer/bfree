// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { useState, useEffect } from 'react';
import MyHead from 'components/MyHead';
import StartButton from 'components/StartButton';
import RideSetup, { TrainerResistanceMode } from 'components/ride/FreeRideSetup';
import PowerResistance, { PowerLimits } from 'components/ride/PowerResistance';
import RollingResistance from 'components/ride/RollingResistance';
import Title from 'components/Title';

const StyledContainer = styled(Container)(({ theme }) => ({}));

function makeStartUrl(resistanceMode: string, rollingResistance: number, powerLimits: PowerLimits, autoSplit: string) {
	let uri = `/ride/record?type=free&resistance=${resistanceMode}`;
	switch (resistanceMode) {
		case 'power':
			uri = `${uri}&minPower=${powerLimits.min}&maxPower=${powerLimits.max}`;
			break;
		case 'slope':
			uri = `${uri}&rollingResistance=${rollingResistance}`;
			break;
	}
	if (autoSplit) {
		uri = `${uri}&split=${autoSplit}`;
	}

	return uri;
}

export default function RideFree() {
	const [resistanceMode, setResistanceMode] = useState<TrainerResistanceMode>('');
	const [rollingResistance, setRollingResistance] = useState<number>(NaN);
	const [powerLimits, setPowerLimits] = useState<PowerLimits>({ min: 0, max: 1000 });
	const [autoSplit, setAutoSplit] = useState<string>('');

	useEffect(() => {
		if (resistanceMode !== 'slope') {
			setRollingResistance(NaN);
		}
	}, [resistanceMode]);

	return (
		<StyledContainer maxWidth="md">
			<MyHead title="Free Ride" />
			<Box>
				<Title href="/ride">Free Ride</Title>
				<p>Start a free ride exercise.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<RideSetup
						resistanceMode={resistanceMode}
						setResistanceMode={setResistanceMode}
						setAutoSplitValue={setAutoSplit}
					/>
					{
						{
							'': <br />,
							basic: <br />,
							power: <PowerResistance limits={powerLimits} setLimits={setPowerLimits} />,
							slope: (
								<RollingResistance
									rollingResistance={rollingResistance}
									setRollingResistance={setRollingResistance}
								/>
							),
						}[resistanceMode]
					}
				</Grid>
			</Box>
			<Box
				sx={{ left: 0, width: '100%' }}
				position="sticky"
				bottom="0px"
				m="auto"
				display="flex"
				justifyContent="center"
				padding="1ex"
			>
				<StartButton
					disabled={!resistanceMode}
					href={makeStartUrl(resistanceMode, rollingResistance, powerLimits, autoSplit)}
				/>
			</Box>
		</StyledContainer>
	);
}
