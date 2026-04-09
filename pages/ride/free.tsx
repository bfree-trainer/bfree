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
import RideSetup, { AutoSplitMode, TrainerResistanceMode } from 'components/ride/FreeRideSetup';
import PowerResistance, { PowerLimits } from 'components/ride/PowerResistance';
import RollingResistance from 'components/ride/RollingResistance';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';
import { saveSession, loadSession } from 'lib/session_settings';

const SESSION_KEY = 'freeRideSettings';
const StyledContainer = styled(Container)(({ theme }) => ({}));

function getInitialAutoSplitValue(autoSplitMode: AutoSplitMode, autoSplit: string): number {
	switch (autoSplitMode) {
		case 'distance':
			return autoSplit.endsWith('km') ? Number(autoSplit.slice(0, -2)) || 0 : 0;
		case 'time':
			return autoSplit.endsWith('min') ? Number(autoSplit.slice(0, -3)) || 0 : 0;
		case 'heartRate':
			return autoSplit.endsWith('bpm') ? Number(autoSplit.slice(0, -3)) || 180 : 180;
		default:
			return 0;
	}
}

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
	const [powerLimits, setPowerLimits] = useState<PowerLimits>({ min: 100, max: 300 });
	const [autoSplitMode, setAutoSplitMode] = useState<AutoSplitMode>('disabled');
	const [autoSplit, setAutoSplit] = useState<string>('');
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const saved = loadSession(SESSION_KEY);
		if (saved) {
			if (saved.resistanceMode) setResistanceMode(saved.resistanceMode);
			if (saved.rollingResistance != null) setRollingResistance(saved.rollingResistance);
			if (saved.powerLimits) setPowerLimits(saved.powerLimits);
			if (saved.autoSplitMode) setAutoSplitMode(saved.autoSplitMode);
			if (saved.autoSplit) setAutoSplit(saved.autoSplit);
		}
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (resistanceMode !== 'slope') {
			setRollingResistance(NaN);
		}
	}, [resistanceMode]);

	useEffect(() => {
		if (!hydrated) return;
		saveSession(SESSION_KEY, {
			resistanceMode,
			rollingResistance: isNaN(rollingResistance) ? null : rollingResistance,
			powerLimits,
			autoSplitMode,
			autoSplit,
		});
	}, [hydrated, resistanceMode, rollingResistance, powerLimits, autoSplitMode, autoSplit]);

	return (
		<StyledContainer maxWidth="md">
			<MyHead title="Free Ride" />
			<Box>
				<Title href="/ride">Free Ride</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Start a free ride exercise.
				</Typography>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<RideSetup
						resistanceMode={resistanceMode}
						setResistanceMode={setResistanceMode}
						autoSplitMode={autoSplitMode}
						setAutoSplitMode={setAutoSplitMode}
						setAutoSplitValue={setAutoSplit}
						initialAutoSplitValue={getInitialAutoSplitValue(autoSplitMode, autoSplit)}
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
