// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MenuCard from 'components/MenuCard';
import MyHead from 'components/MyHead';
import Title from 'components/Title';

export default function Ride() {
	return (
		<Container maxWidth="md">
			<MyHead title="Ride" />
			<Box>
				<Title href="/">Ride</Title>
				<p>Select the ride type.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<MenuCard title="Free Ride" href="/ride/free">
						Adjust resistance as you ride.
					</MenuCard>
					<MenuCard title="Workout" href="/ride/workout">
						Predefined workout profiles.
					</MenuCard>
					<MenuCard title="Map Ride" href="/ride/map">
						Ride along a route on a map.
					</MenuCard>
					<MenuCard title="Virtual Ride" href="/ride/virtual">
						Virtual ride with a recorded profile and video.
					</MenuCard>
				</Grid>
			</Box>
		</Container>
	);
}
