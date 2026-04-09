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
import { useTheme } from '@mui/material/styles';
import SxPropsTheme from 'lib/SxPropsTheme';
import { getElapsedTimeStr } from 'lib/format';
import { useGlobalState } from 'lib/global';
import { smartDistanceUnitFormat } from 'lib/units';
import { recordCardMinHeight, inlineIconFontSize } from 'lib/tokens';

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
	const theme = useTheme();
	const isBreakpoint = useMediaQuery(theme.breakpoints.up('md'));

	// TODO meters & km based on length
	// TODO lap distance

	return (
		<Grid item xs={4} md={4}>
			<Card variant="outlined">
				<CardContent sx={{ minHeight: recordCardMinHeight }}>
					<Typography gutterBottom variant="h5" component="h2">
						<IconTimelapse sx={{ fontSize: inlineIconFontSize }} /> {isBreakpoint ? 'Time & Distance' : ''}
					</Typography>
					{isBreakpoint ? <InfoDesktop /> : <InfoMobile />}
				</CardContent>
			</Card>
		</Grid>
	);
}
