// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { useEffect } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';

/**
 * Renders all ride tracks as semi-transparent polylines so that
 * frequently ridden routes appear more vivid — a simple heatmap effect.
 */
export default function RideHeatmapLayer({ tracks }: { tracks: [number, number][][] }) {
	const map = useMap();

	useEffect(() => {
		if (!map || tracks.length === 0) return;

		const allPositions: [number, number][] = tracks.flat();
		if (allPositions.length === 0) return;

		const lats = allPositions.map((p) => p[0]);
		const lons = allPositions.map((p) => p[1]);
		const bounds: LatLngBoundsExpression = [
			[Math.min(...lats), Math.min(...lons)],
			[Math.max(...lats), Math.max(...lons)],
		];
		map.fitBounds(bounds, { padding: [24, 24] });
	}, [map, tracks]);

	return (
		<>
			{tracks.map((positions, i) => {
				// Build a stable key from the index and the first coordinate so React
				// can identify each track even if the list is re-ordered.
				const firstPt = positions[0];
				const key = firstPt ? `${i}_${firstPt[0]}_${firstPt[1]}` : `${i}`;
				return (
					<Polyline
						key={key}
						positions={positions}
						pathOptions={{ color: '#1976D2', weight: 3, opacity: 0.35 }}
					/>
				);
			})}
		</>
	);
}

export type RideHeatmapLayerArgs = Parameters<typeof RideHeatmapLayer>[0];
