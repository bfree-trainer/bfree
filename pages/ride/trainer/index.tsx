// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MenuCard from 'components/MenuCard';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';

export default function IndoorTrainer() {
	return (
		<Container maxWidth="md">
			<MyHead title="Indoor Trainer" />
			<Box>
				<Title href="/ride">Indoor Trainer</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Choose how you want to ride.
				</Typography>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<MenuCard title="Free Ride" href="/ride/trainer/free">
						Adjust resistance as you ride.
					</MenuCard>
					<MenuCard title="Workout" href="/ride/trainer/workout">
						Predefined workout profiles.
					</MenuCard>
					<MenuCard title="Map Ride" href="/ride/trainer/map">
						Ride along a route on a map.
					</MenuCard>
					<MenuCard title="Virtual Ride" href="/ride/trainer/virtual">
						Virtual ride with a recorded profile and video.
					</MenuCard>
				</Grid>
			</Box>
		</Container>
	);
}
