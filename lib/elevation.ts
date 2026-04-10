// SPDX-FileCopyrightText: 2026 Bfree contributors
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Coord } from './gpx_parser';

/**
 * Maximum number of coordinates per Open-Meteo elevation API request.
 * The API supports up to 100 points per call.
 */
const BATCH_SIZE = 100;

/**
 * Fetch elevation data for an array of coordinates using the Open-Meteo
 * Elevation API (https://open-meteo.com/en/docs/elevation-api).
 *
 * - Free, no API key required
 * - Uses Copernicus DEM (90 m global) with SRTM (30 m) where available
 * - Batch queries up to 100 coordinates per request
 *
 * Coordinates with more than 100 points are automatically split into
 * multiple requests and merged.
 *
 * @returns Elevation in metres for each input coordinate, in the same order.
 * @throws Error if the API request fails.
 */
export async function getElevations(coords: Coord[]): Promise<number[]> {
	if (coords.length === 0) return [];

	const batches: Coord[][] = [];
	for (let i = 0; i < coords.length; i += BATCH_SIZE) {
		batches.push(coords.slice(i, i + BATCH_SIZE));
	}

	const results = await Promise.all(batches.map(fetchBatch));
	return results.flat();
}

async function fetchBatch(batch: Coord[]): Promise<number[]> {
	const lats = batch.map((c) => c.lat.toFixed(6)).join(',');
	const lons = batch.map((c) => c.lon.toFixed(6)).join(',');
	const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Elevation API request failed: ${response.status} ${response.statusText}`);
	}

	const data: { elevation: number[] } = await response.json();
	return data.elevation;
}
