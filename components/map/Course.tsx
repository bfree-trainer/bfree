// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useMemo } from 'react';
import { useMap, CircleMarker } from 'react-leaflet';
import AntPath from '../../components/map/AntPath';
import MapWaypoint from './Waypoint';
import { CourseData, Segment } from '../../lib/gpx_parser';

function trackSegmentsToPolylines(segments: Segment[]) {
	return segments.map((seg) => seg.trackpoints.map(({ lat, lon }) => [lat, lon]));
}

function Segment({ polyline }) {
	const first = polyline[0];
	const last = polyline[polyline.length - 1];

	if (!first || !last) {
		return null;
	}

	return (
		<>
			{/* @ts-ignore*/}
			<CircleMarker center={first} radius={20} pathOptions={{ color: 'blue' }} />
			{/* @ts-ignore*/}
			<CircleMarker center={last} radius={20} pathOptions={{ color: 'red' }} />
			<AntPath positions={polyline} options={{ hardwareAccelerated: true, delay: 2000 }} />
		</>
	);
}

export default function MapCourse({ course }: { course: CourseData }) {
	const map = useMap();
	const waypoints = course?.waypoints || [];
	const polylines = useMemo(() => trackSegmentsToPolylines(course?.tracks[0]?.segments || []), [course]);

	useEffect(() => {
		if (map && polylines.length > 0 && polylines[0].length > 0) {
			map.flyTo(polylines[0][0], map.getZoom());
		}
	}, [map, polylines]);

	return (
		<>
			<>
				{polylines.map((polyline, i: number) => (
					<Segment key={i} polyline={polyline} />
				))}
			</>
			<>
				{waypoints.map(({ lat, lon, name }, i: number) => (
					<MapWaypoint key={i} position={[lat, lon]}>
						{name}
					</MapWaypoint>
				))}
			</>
		</>
	);
}
