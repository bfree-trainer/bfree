// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconTimelapse from '@mui/icons-material/Timelapse';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import SxPropsTheme from '../../lib/SxPropsTheme';
import { getElapsedTimeStr } from '../../lib/format';
import { useGlobalState } from '../../lib/global';
import { smartDistanceUnitFormat } from '../../lib/units';

const valueStyle: SxPropsTheme = {
	float: 'right',
};

function InfoDesktop() {
	const distanceUnit = useGlobalState('unitDistance')[0];
	const [elapsedTime] = useGlobalState('elapsedTime');
	const [elapsedLapTime] = useGlobalState('elapsedLapTime');
	const [rideDistance] = useGlobalState('rideDistance');
	const [lapDistance] = useGlobalState('lapDistance');

	return (
		<Container>
			<b>Ride time:</b> <Box sx={valueStyle}>{getElapsedTimeStr(elapsedTime)}</Box>
			<br />
			<b>Lap time:</b> <Box sx={valueStyle}>{getElapsedTimeStr(elapsedLapTime)}</Box>
			<br />
			<b>Ride distance:</b> <Box sx={valueStyle}>{smartDistanceUnitFormat(distanceUnit, rideDistance)}</Box>
			<br />
			<b>Lap distance:</b> <Box sx={valueStyle}>{smartDistanceUnitFormat(distanceUnit, lapDistance)}</Box>
		</Container>
	);
}

function InfoMobile() {
	const distanceUnit = useGlobalState('unitDistance')[0];
	const [elapsedTime] = useGlobalState('elapsedTime');
	const [elapsedLapTime] = useGlobalState('elapsedLapTime');
	const [rideDistance] = useGlobalState('rideDistance');
	const [lapDistance] = useGlobalState('lapDistance');

	return (
		<Container>
			<b>Total</b>
			<br />
			<Box sx={valueStyle}>{getElapsedTimeStr(elapsedTime)}</Box>
			<br />
			<Box sx={valueStyle}>{smartDistanceUnitFormat(distanceUnit, rideDistance)}</Box>
			<br />
			<b>Lap</b>
			<br />
			<Box sx={valueStyle}>{getElapsedTimeStr(elapsedLapTime)}</Box>
			<br />
			<Box sx={valueStyle}>{smartDistanceUnitFormat(distanceUnit, lapDistance)}</Box>
		</Container>
	);
}

export default function Ride() {
	const isBreakpoint = useMediaQuery('(min-width:800px)');

	// TODO meters & km based on length
	// TODO lap distance

	return (
		<Grid item xs={4}>
			<Card variant="outlined">
				<CardContent sx={{ height: '10em' }}>
					<Typography gutterBottom variant="h5" component="h2">
						<IconTimelapse sx={{ fontSize: '18px !important' }} /> {isBreakpoint ? 'Time & Distance' : ''}
					</Typography>
					{isBreakpoint ? <InfoDesktop /> : <InfoMobile />}
				</CardContent>
			</Card>
		</Grid>
	);
}
