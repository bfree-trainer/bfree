// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { EXPLORER_ZOOM, collectVisitedTiles, findMaxSquare, tileToBounds } from 'lib/explorer_tiles';

/**
 * Renders Veloviewer-style explorer tiles on a Leaflet map:
 *
 * - Each visited OSM zoom-14 tile is drawn as a semi-transparent blue square.
 * - The largest contiguous square of visited tiles (the "max square") is
 *   highlighted with an orange border, matching the Veloviewer style.
 *
 * Uses the native Leaflet API via `useEffect` for performance — adding
 * individual React elements for potentially thousands of tiles would be slow.
 */
export default function ExplorerTilesLayer({ tracks }: { tracks: [number, number][][] }) {
	const map = useMap();

	useEffect(() => {
		if (!map) return;

		const visitedTiles = collectVisitedTiles(tracks, EXPLORER_ZOOM);
		if (visitedTiles.size === 0) return;

		const maxSquare = findMaxSquare(visitedTiles);
		const layerGroup = L.layerGroup().addTo(map);

		// Draw all visited tiles as semi-transparent blue rectangles.
		for (const key of visitedTiles) {
			const parts = key.split(',');
			const tx = Number(parts[0]);
			const ty = Number(parts[1]);
			const b = tileToBounds(tx, ty, EXPLORER_ZOOM);
			L.rectangle(
				[
					[b.south, b.west],
					[b.north, b.east],
				],
				{
					color: '#1976D2',
					fillColor: '#1976D2',
					fillOpacity: 0.3,
					weight: 0.5,
					opacity: 0.6,
				},
			).addTo(layerGroup);
		}

		// Draw the max-square outline in Veloviewer orange.
		if (maxSquare) {
			const nwBounds = tileToBounds(maxSquare.minX, maxSquare.minY, EXPLORER_ZOOM);
			const seBounds = tileToBounds(
				maxSquare.minX + maxSquare.size - 1,
				maxSquare.minY + maxSquare.size - 1,
				EXPLORER_ZOOM,
			);
			L.rectangle(
				[
					[seBounds.south, nwBounds.west],
					[nwBounds.north, seBounds.east],
				],
				{
					color: '#ff7700',
					fill: false,
					weight: 3,
					opacity: 0.9,
				},
			).addTo(layerGroup);
		}

		// Fit the map to show all visited tiles with a small padding.
		const tileCoords = Array.from(visitedTiles).map((s) => {
			const parts = s.split(',');
			return [Number(parts[0]), Number(parts[1])] as [number, number];
		});
		const minX = Math.min(...tileCoords.map(([x]) => x));
		const maxX = Math.max(...tileCoords.map(([x]) => x));
		const minY = Math.min(...tileCoords.map(([, y]) => y));
		const maxY = Math.max(...tileCoords.map(([, y]) => y));
		const swFit = tileToBounds(minX, maxY, EXPLORER_ZOOM);
		const neFit = tileToBounds(maxX, minY, EXPLORER_ZOOM);
		map.fitBounds(
			[
				[swFit.south, swFit.west],
				[neFit.north, neFit.east],
			],
			{ padding: [24, 24] },
		);

		return () => {
			layerGroup.remove();
		};
	}, [map, tracks]);

	return null;
}

export type ExplorerTilesLayerArgs = Parameters<typeof ExplorerTilesLayer>[0];
