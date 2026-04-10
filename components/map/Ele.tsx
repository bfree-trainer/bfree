// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { CourseData } from '../../lib/gpx_parser';
import haversine from '../../lib/haversine';
import { metricColors, chartColors } from '../../lib/tokens';

export default function Ele({
	course,
	showMarker,
	moveMarker,
}: {
	course?: CourseData;
	showMarker(en: boolean): void;
	moveMarker(pos: [number, number]): void;
}) {
	const dist = useRef(0);
	const data = useMemo(() => {
		dist.current = 0;
		if (!course || !course.tracks || course.tracks.length === 0) {
			return [
				{ distance: 0, elevation: 0 },
				{ distance: 1, elevation: 0 },
			];
		}

		return course.tracks.flatMap((track) =>
			track.segments
				.map(({ trackpoints: tp }) => tp)
				.flat(1)
				.map((tp, i, arr) => ({
					distance:
						i === 0
							? dist.current
							: (dist.current += haversine([arr[i - 1].lat, arr[i - 1].lon], [tp.lat, tp.lon])),
					elevation: tp.ele,
					position: [tp.lat, tp.lon] as [number, number],
				}))
		);
	}, [course]);

	const formatValue = (value: number) => `${value.toFixed(2)}m`;

	// Track the latest hovered point so we can update the marker in an effect
	// rather than during the render phase of CustomTooltip.
	const [hoveredPoint, setHoveredPoint] = useState<{ position: [number, number] } | null>(null);

	useEffect(() => {
		if (hoveredPoint?.position) {
			moveMarker(hoveredPoint.position);
			showMarker(true);
		}
	}, [hoveredPoint, moveMarker, showMarker]);

	const handleMouseLeave = useCallback(() => {
		setHoveredPoint(null);
		showMarker(false);
	}, [showMarker]);

	const CustomTooltip = ({ active, payload }: any) => {
		const point = active && payload?.[0]?.payload;

		useEffect(() => {
			if (point?.position) {
				setHoveredPoint(point);
			}
		}, [point]);

		if (!point) return null;

		return (
			<Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
				<Typography variant="body2">{`Distance: ${formatValue(point.distance)}`}</Typography>
				<Typography variant="body2">{`Elevation: ${formatValue(point.elevation)}`}</Typography>
			</Paper>
		);
	};

	return (
		<Box sx={{ width: '100%', height: 256 }} role="img" aria-label="Elevation profile chart">
			<ResponsiveContainer>
				<AreaChart
					data={data}
					margin={{ top: 10, right: 10, bottom: 50, left: 45 }}
					onMouseLeave={handleMouseLeave}
				>
					<CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
					<XAxis
						dataKey="distance"
						tickFormatter={formatValue}
						label={{
							value: 'distance',
							position: 'bottom',
							offset: 25,
							fill: chartColors.axisLabel,
						}}
						angle={45}
						tickMargin={30}
						tick={{ fill: chartColors.tickLabel, fontSize: 11 }}
						stroke={chartColors.axis}
					/>
					<YAxis
						dataKey="elevation"
						tickFormatter={formatValue}
						label={{
							value: 'elevation',
							angle: -90,
							position: 'insideLeft',
							offset: -35,
							fill: chartColors.axisLabel,
						}}
						tick={{ fill: chartColors.tickLabel, fontSize: 11 }}
						stroke={chartColors.axis}
					/>
					<Tooltip content={<CustomTooltip />} />
					<defs>
						<linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor={metricColors.elevation} stopOpacity={0.8} />
							<stop offset="95%" stopColor={metricColors.elevation} stopOpacity={0.2} />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="elevation"
						stroke={metricColors.elevation}
						fill="url(#elevationGradient)"
						dot={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</Box>
	);
}
