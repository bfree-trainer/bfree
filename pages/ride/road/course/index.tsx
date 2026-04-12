// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';
import RoutePlannerPanel from 'components/RoutePlannerPanel';
import BottomNavi from 'components/BottomNavi';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import IconDownload from '@mui/icons-material/GetApp';
import { CourseData, courseData2gpx, courseDistanceM } from 'lib/gpx_parser';
import downloadBlob from 'lib/download_blob';
import { rideRepository } from 'lib/orm';
import { useGlobalState } from 'lib/global';
import { speedUnitConv, smartDistanceUnitFormat } from 'lib/units';
import { formatDuration } from 'lib/format';

/**
 * Compute average speed in m/s from `road` activities in the past 4 weeks.
 * Returns null if no qualifying activities are found.
 */
function computeAvgRoadSpeedMps(): number | null {
	const now = new Date();
	const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
	const logs = rideRepository.findBetween(fourWeeksAgo, now).filter((e) => e.logger.getActivityType() === 'road');

	const totalDistanceM = logs.reduce((s, e) => s + e.logger.getTotalDistance(), 0);
	const totalTimeMs = logs.reduce((s, e) => s + e.logger.getTotalTime(), 0);

	if (totalDistanceM <= 0 || totalTimeMs <= 0) return null;

	return totalDistanceM / (totalTimeMs / 1000); // m/s
}

export default function RoadCourse() {
	const [course, setCourse] = useState<CourseData | null>(null);
	const [courseName, setCourseName] = useState('Untitled');
	const [avgSpeedMps, setAvgSpeedMps] = useState<number | null>(null);
	const [unitDistance] = useGlobalState('unitDistance');
	const [unitSpeed] = useGlobalState('unitSpeed');

	useEffect(() => {
		rideRepository.ready.then(() => setAvgSpeedMps(computeAvgRoadSpeedMps()));
	}, []);

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

	const courseDistM = course ? courseDistanceM(course) : null;
	const estimatedTimeMs =
		courseDistM !== null && avgSpeedMps !== null && avgSpeedMps > 0 ? (courseDistM / avgSpeedMps) * 1000 : null;
	const displaySpeed = avgSpeedMps !== null ? speedUnitConv[unitSpeed].convTo(avgSpeedMps).toFixed(1) : null;
	const speedUnitName = speedUnitConv[unitSpeed].name;

	return (
		<Container maxWidth="md">
			<MyHead title="Course" />
			<Box sx={{ pb: 9 }}>
				<Title href="/ride/road">Course</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Plan a route or import a GPX file.
				</Typography>
				<RoutePlannerPanel onCourseChange={handleCourseChange} />
				{courseDistM !== null && courseDistM > 0 && (
					<Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
						<Typography
							variant="overline"
							color="text.secondary"
							sx={{ letterSpacing: 1.2, lineHeight: 2 }}
						>
							Ride Estimate
						</Typography>
						<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
							<Box>
								<Typography variant="h5" fontWeight={700} color="primary">
									{smartDistanceUnitFormat(unitDistance, courseDistM)}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									distance
								</Typography>
							</Box>
							{estimatedTimeMs !== null ? (
								<>
									<Box>
										<Typography variant="h5" fontWeight={700} color="primary">
											{formatDuration(estimatedTimeMs)}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											est. time
										</Typography>
									</Box>
									<Box>
										<Typography variant="h5" fontWeight={700} color="primary">
											{displaySpeed} {speedUnitName}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											avg speed (past 4 weeks)
										</Typography>
									</Box>
								</>
							) : (
								<Box sx={{ display: 'flex', alignItems: 'center' }}>
									<Typography variant="body2" color="text.secondary">
										Complete a road ride to see time estimates.
									</Typography>
								</Box>
							)}
						</Box>
					</Paper>
				)}
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
