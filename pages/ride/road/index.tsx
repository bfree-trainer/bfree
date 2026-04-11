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

export default function Road() {
	return (
		<Container maxWidth="md">
			<MyHead title="Road" />
			<Box>
				<Title href="/">Road</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Choose how you want to ride.
				</Typography>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<MenuCard title="Course" href="/ride/road/course">
						Find or plan a course.
					</MenuCard>
				</Grid>
			</Box>
		</Container>
	);
}
