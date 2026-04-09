// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { useEffect } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { createActivityLog } from 'lib/activity_log';
import OpenStreetMap from 'components/map/OpenStreetMap';
import 'leaflet/dist/leaflet.css';

function FitBounds({ positions }: { positions: [number, number][] }) {
	const map = useMap();

	useEffect(() => {
		if (map && positions.length > 1) {
			map.fitBounds(positions);
		} else if (map && positions.length === 1) {
			map.setView(positions[0], 13);
		}
	}, [map, positions]);

	return null;
}

export default function RideMiniMap({ logger }: { logger: ReturnType<typeof createActivityLog> }) {
	const positions: [number, number][] = logger
		.getLaps()
		.flatMap((lap) => lap.trackPoints)
		.filter(
			(tp) =>
				tp.position &&
				typeof tp.position.lat === 'number' &&
				typeof tp.position.lon === 'number'
		)
		.map((tp) => [tp.position.lat, tp.position.lon]);

	if (positions.length === 0) {
		return null;
	}

	const center = positions[0];

	return (
		<OpenStreetMap center={center} width="100%" height="200px" setMap={null}>
			<FitBounds positions={positions} />
			<Polyline positions={positions} pathOptions={{ color: '#1976d2', weight: 3 }} />
		</OpenStreetMap>
	);
}
