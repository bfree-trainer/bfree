// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';
import RoutePlannerPanel from 'components/RoutePlannerPanel';
import BottomNavi from 'components/BottomNavi';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import IconDownload from '@mui/icons-material/GetApp';

export default function RoadCourse() {
	return (
		<Container maxWidth="md">
			<MyHead title="Course" />
			<Box>
				<Title href="/ride/road">Course</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Plan a route or import a GPX file.
				</Typography>
				<RoutePlannerPanel />
			</Box>
			<BottomNavi>
				<BottomNavigationAction
					label="Download"
					icon={<IconDownload />}
					onClick={(e) => {
						e.preventDefault();
					}}
				/>
			</BottomNavi>
		</Container>
	);
}
