// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { getElapsedTimeStr } from 'lib/format';
import SxPropsTheme from 'lib/SxPropsTheme';
import { useGlobalState } from 'lib/global';

const timeStyle: SxPropsTheme = {
	float: 'right',
};

export default function Time() {
	const [elapsedTime] = useGlobalState('elapsedTime');
	const [elapsedLapTime] = useGlobalState('elapsedLapTime');

	return (
		<Grid item xs={4}>
			<Card variant="outlined">
				<CardContent sx={{ height: '10em' }}>
					<Typography gutterBottom variant="h5" component="h2">
						Time
					</Typography>
					<Container>
						<b>Ride time:</b> <Box sx={timeStyle}>{getElapsedTimeStr(elapsedTime)}</Box>
						<br />
						<b>Lap time:</b> <Box sx={timeStyle}>{getElapsedTimeStr(elapsedLapTime)}</Box>
					</Container>
				</CardContent>
			</Card>
		</Grid>
	);
}
