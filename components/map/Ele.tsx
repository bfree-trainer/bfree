// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { CourseData } from '../../lib/gpx_parser';
import haversine from '../../lib/haversine';
import { metricColors, chartColors } from '../../lib/tokens';

type ChartPoint = {
	distance: number;
	elevation: number;
	position: [number, number];
};

const formatValue = (value: number) => `${value.toFixed(2)}m`;

/** Maximum number of data-points fed into Recharts.
 *  Large GPX files can easily contain 10k+ points; rendering all of them
 *  makes the SVG very heavy.  We subsample to keep the chart responsive. */
const MAX_CHART_POINTS = 500;

const CHART_MARGIN = { top: 10, right: 10, bottom: 50, left: 45 } as const;

const EMPTY_DATA: ChartPoint[] = [
	{ distance: 0, elevation: 0, position: [0, 0] },
	{ distance: 1, elevation: 0, position: [0, 0] },
];

function CustomTooltip({
	active,
	payload,
	onHover,
}: {
	active?: boolean;
	payload?: Array<{ payload: ChartPoint }>;
	onHover: (point: ChartPoint | null) => void;
}) {
	const point = active && payload?.[0]?.payload;

	useEffect(() => {
		onHover(point || null);
	}, [point, onHover]);

	if (!point) return null;

	return (
		<Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
			<Typography variant="body2">{`Distance: ${formatValue(point.distance)}`}</Typography>
			<Typography variant="body2">{`Elevation: ${formatValue(point.elevation)}`}</Typography>
		</Paper>
	);
}

export default function Ele({
	course,
	showMarker,
	moveMarker,
}: {
	course?: CourseData;
	showMarker(en: boolean): void;
	moveMarker(pos: [number, number]): void;
}) {
	// Compute chart points from course data. Also track whether the incoming
	// trackpoints have real elevation populated (vs. the `?? 0` fallback).
	const computed = useMemo(() => {
		if (!course || !course.tracks || course.tracks.length === 0) {
			return { points: EMPTY_DATA, eleReady: false };
		}

		const allTp = course.tracks.flatMap((track) =>
			track.segments.flatMap((seg) => seg.trackpoints),
		);

		if (allTp.length < 2) {
			return { points: EMPTY_DATA, eleReady: false };
		}

		const withEle = allTp.filter((tp) => tp.ele != null).length;
		const eleReady = withEle > allTp.length * 0.5;

		const points = allTp.reduce<ChartPoint[]>((acc, tp, i) => {
			const prevDist = i === 0 ? 0 : acc[i - 1].distance;
			const segDist =
				i === 0
					? 0
					: haversine([allTp[i - 1].lat, allTp[i - 1].lon], [tp.lat, tp.lon]);
			acc.push({
				distance: prevDist + segDist,
				elevation: tp.ele ?? 0,
				position: [tp.lat, tp.lon],
			});
			return acc;
		}, []);

		let finalPoints = points;
		if (points.length > MAX_CHART_POINTS) {
			const step = (points.length - 1) / (MAX_CHART_POINTS - 1);
			finalPoints = Array.from({ length: MAX_CHART_POINTS }, (_, i) => points[Math.round(i * step)]);
		}

		return { points: finalPoints, eleReady };
	}, [course]);

	// Only update the displayed chart data when the new data actually has
	// elevation populated.  This prevents the chart from flashing to zero
	// during the window between an immediate RoutePlanner emit (no ele) and
	// the async elevation API response.
	//
	// Uses the "adjusting state during rendering" pattern recommended by React:
	// https://react.dev/reference/react/useState#storing-information-from-previous-renders
	const [chartState, setChartState] = useState<{ data: ChartPoint[]; hadEle: boolean }>({
		data: computed.points,
		hadEle: false,
	});
	const [prevComputed, setPrevComputed] = useState(computed);

	if (computed !== prevComputed) {
		setPrevComputed(computed);
		const isPlaceholder = computed.points === EMPTY_DATA;

		if (isPlaceholder) {
			setChartState({ data: EMPTY_DATA, hadEle: false });
		} else if (computed.eleReady || !chartState.hadEle) {
			setChartState({ data: computed.points, hadEle: computed.eleReady });
		}
		// Otherwise: had good elevation before but new data doesn't → skip,
		// keep showing the previous profile until enriched data arrives.
	}

	const data = chartState.data;

	// Track the latest hovered point so we can update the marker in an effect
	// rather than during the render phase of CustomTooltip.
	const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

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

	const handleTooltipHover = useCallback((point: ChartPoint | null) => {
		setHoveredPoint(point);
	}, []);

	return (
		<Box sx={{ width: '100%', height: 256 }} role="img" aria-label="Elevation profile chart">
			<ResponsiveContainer>
				<AreaChart
					data={data}
					margin={CHART_MARGIN}
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
					<Tooltip content={<CustomTooltip onHover={handleTooltipHover} />} />
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
						animationDuration={300}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</Box>
	);
}
