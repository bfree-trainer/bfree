import { useMemo, useRef } from 'react';
import { ResponsiveLine, Serie } from '@nivo/line';
import { CourseData } from '../../lib/gpx_parser';
import haversine from '../../lib/haversine';

function findLatLon(
	data: Array<{ id: any; color?: any; data: { x: number; y: number; pos: [number, number] } }>,
	x: number
): [number, number] | undefined {
	return data.find((el) => el.data.x == x)?.data?.pos;
}

// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
// website examples showcase many properties,
// you'll often use just a few of them.
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
	const data: Serie[] = useMemo(
		() => {
			dist.current = 0;
			return !course || !course.tracks || course.tracks.length === 0
				? [
						{
							id: 'none',
							color: 'hsl(218, 70%, 50%)',
							data: [
								{ x: 0, y: 0 },
								{ x: 1, y: 0 },
							],
						},
				  ]
				: course.tracks.map((track) => ({
						id: track.name,
						color: 'hsl(218, 70%, 50%)',
						data: track.segments
							.map(({ trackpoints: tp }) => tp)
							.flat(1)
							.map((tp, i, arr) => ({
								x:
									i == 0
										? dist.current
										: (dist.current += haversine([arr[i - 1].lat, arr[i - 1].lon], [tp.lat, tp.lon])),
								y: tp.ele,
								pos: [tp.lat, tp.lon],
							})),
				  }));
		},
		[course]
	);

	return (
		<ResponsiveLine
			data={data}
			margin={{ top: 10, right: 10, bottom: 50, left: 45 }}
			xScale={{ type: 'linear', min: 0, max: 'auto' }}
			xFormat=" >-.2s"
			yScale={{ type: 'linear', min: 0, max: 'auto' }}
			yFormat=" >-.2f"
			curve="monotoneX"
			axisTop={null}
			axisRight={null}
			axisBottom={{
				tickSize: 5,
				tickPadding: 5,
				tickRotation: 45,
				format: ' >-.2s',
				legend: 'distance',
				legendOffset: 36,
				legendPosition: 'middle',
			}}
			axisLeft={{
				tickSize: 5,
				tickPadding: 5,
				tickRotation: 0,
				format: '.2s',
				legend: 'elevation',
				legendOffset: -40,
				legendPosition: 'middle',
			}}
			colors={{ scheme: 'purple_orange' }}
			lineWidth={1}
			enablePoints={false}
			pointSize={4}
			pointColor={{ theme: 'background' }}
			pointBorderWidth={1}
			pointBorderColor={{ from: 'serieColor' }}
			pointLabelYOffset={-12}
			enableArea={true}
			useMesh={true}
			enableSlices="x"
			sliceTooltip={(v) => {
				const point = v?.slice?.points[0];
				// @ts-ignore
				if (point?.data.pos) {
					// @ts-ignore
					moveMarker(point.data.pos);
					showMarker(true);
				}
				return point ? `${point.data?.xFormatted}m, ${point.data.yFormatted}m` : '';
			}}
			gridXValues={[0, 20, 40, 60, 80, 100, 120]}
			gridYValues={[0, 500, 1000, 1500, 2000, 2500]}
			legends={[]}
		/>
	);
}
/*
			onMouseEnter={(point, event) => {
				// @ts-ignore
				const pos = findLatLon(data, point.data?.x); if (pos) { moveMarker(pos); showMarker(true); } }}
			onMouseLeave={(point, event) => showMarker(false)}
			onMouseMove={(point, event) => {
				// @ts-ignore
				const pos = findLatLon(data, point.data?.x);
				console.log('move', pos)
				if (pos) moveMarker(pos);
			}}
	 */
