// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState, useRef, useMemo } from 'react';
import L from 'leaflet';
import { FeatureGroup, Polyline } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { createMarkerIcon } from './Marker';
import { CourseData, Segment, Trackpoint } from '../../lib/gpx_parser';
import MapWaypoint from './Waypoint';
import 'node_modules/leaflet/dist/leaflet.css';
import 'node_modules/leaflet-draw/dist/leaflet.draw.css';

function trackSegmentsToPolylines(segments: Segment[]) {
	return segments.map((seg) => seg.trackpoints.map(({ lat, lon }) => [lat, lon]));
}

function updateTrackSegment(course: CourseData, i: number, trackpoints: Trackpoint[]) {
	if (!course.tracks[0]) {
		course.tracks[0] = { segments: [] };
	}
	if (!course.tracks[0].segments[i]) {
		course.tracks[0].segments[i] = { trackpoints: [] };
	}

	course.tracks[0].segments[i].trackpoints = trackpoints;

	return course;
}

export default function MapEditCourse({
	initialCourse,
	setCourse,
}: {
	initialCourse?: CourseData;
	setCourse?: (o: CourseData) => void;
}) {
	const featureGroupRef = useRef();
	const [initStr] = useState(() =>
		JSON.stringify(
			initialCourse || {
				tracks: [],
				routes: [],
				waypoints: [],
			}
		)
	);
	const init = useMemo<CourseData>(() => JSON.parse(initStr), [initStr]);
	const initTrackpoints = useMemo(() => trackSegmentsToPolylines(init?.tracks[0]?.segments || []), [init]);
	const editEvent = (_e) => {
		if (!featureGroupRef.current) {
			return;
		}

		const newCourse = JSON.parse(initStr);
		let seg = 0;
		let wp = 0;

		newCourse.tracks = [{ segments: [] }];
		newCourse.waypoints = [];

		// @ts-expect-error featureGroupRef.current.getLayers() exists at runtime
		for (const [, layer] of Object.entries(featureGroupRef.current.getLayers())) {
			if (layer instanceof L.Polyline) {
				// @ts-expect-error accessing private Leaflet property _latlngs
				if (layer._latlngs && layer._latlngs.length > 0) {
					updateTrackSegment(
						newCourse,
						seg++,
						// @ts-expect-error accessing private Leaflet property _latlngs
						layer._latlngs.map((v) => ({ lat: v.lat, lon: v.lng }))
					);
				}
			} else if (layer instanceof L.Marker) {
				// @ts-expect-error accessing private Leaflet property _latlng
				newCourse.waypoints[wp++] = { lat: layer._latlng.lat, lon: layer._latlng.lng };
			}
		}

		setCourse(newCourse);
	};

	return (
		<FeatureGroup ref={featureGroupRef}>
			<EditControl
				position="topleft"
				draw={{
					polygon: false,
					rectangle: false,
					circle: false,
					circlemarker: false,
					marker: { icon: createMarkerIcon() },
				}}
				onCreated={editEvent}
				onEdited={editEvent}
				onDeleted={editEvent}
			/>
			<>
				{initTrackpoints.map((pos, i) => (
					<Polyline key={i} positions={initTrackpoints} />
				))}
			</>
			<>
				{init.waypoints.map(({ lat, lon, name }, i: number) => (
					<MapWaypoint key={i} position={[lat, lon]}>
						{name}
					</MapWaypoint>
				))}
			</>
		</FeatureGroup>
	);
}
