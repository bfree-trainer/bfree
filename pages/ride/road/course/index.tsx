// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';
import RoutePlannerPanel from 'components/RoutePlannerPanel';
import BottomNavi from 'components/BottomNavi';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import IconDownload from '@mui/icons-material/GetApp';
import { CourseData, courseData2gpx } from 'lib/gpx_parser';
import downloadBlob from 'lib/download_blob';

export default function RoadCourse() {
	const [course, setCourse] = useState<CourseData | null>(null);
	const [courseName, setCourseName] = useState('Untitled');

	const handleCourseChange = useCallback((c: CourseData | null, name: string) => {
		setCourse(c);
		setCourseName(name);
	}, []);

	const handleDownload = () => {
		if (!course) return;
		const gpx = courseData2gpx(course);
		const blob = new Blob([gpx], { type: 'application/gpx+xml' });
		const filename = `${courseName || 'course'}.gpx`;
		downloadBlob(blob, filename);
	};

	return (
		<Container maxWidth="md">
			<MyHead title="Course" />
			<Box>
				<Title href="/ride/road">Course</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Plan a route or import a GPX file.
				</Typography>
				<RoutePlannerPanel onCourseChange={handleCourseChange} />
			</Box>
			<BottomNavi>
				<BottomNavigationAction
					label="Download"
					icon={<IconDownload />}
					disabled={!course}
					onClick={handleDownload}
				/>
			</BottomNavi>
		</Container>
	);
}
