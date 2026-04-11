// SPDX-FileCopyrightText: 2026 Bfree contributors
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Coord } from './gpx_parser';

/**
 * Maximum number of coordinates per Open-Meteo elevation API request.
 * The API supports up to 100 points per call.
 */
const BATCH_SIZE = 100;

/** Per-batch request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 10_000;

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
 * @param coords Array of coordinates to look up.
 * @param signal Optional AbortSignal to cancel in-flight requests.
 * @returns Elevation in metres for each input coordinate, in the same order.
 * @throws Error if the API request fails or is aborted.
 */
export async function getElevations(coords: Coord[], signal?: AbortSignal): Promise<number[]> {
	if (coords.length === 0) return [];

	const batches: Coord[][] = [];
	for (let i = 0; i < coords.length; i += BATCH_SIZE) {
		batches.push(coords.slice(i, i + BATCH_SIZE));
	}

	const results = await Promise.all(batches.map((b) => fetchBatch(b, signal)));
	return results.flat();
}

async function fetchBatch(batch: Coord[], outerSignal?: AbortSignal): Promise<number[]> {
	const lats = batch.map((c) => c.lat.toFixed(6)).join(',');
	const lons = batch.map((c) => c.lon.toFixed(6)).join(',');
	const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;

	// Combine the caller's abort signal with a per-request timeout.
	const timeoutId = setTimeout(() => timeoutCtrl.abort(), REQUEST_TIMEOUT_MS);
	const timeoutCtrl = new AbortController();

	const combinedSignal = outerSignal ? AbortSignal.any([outerSignal, timeoutCtrl.signal]) : timeoutCtrl.signal;

	let response: Response;
	try {
		response = await fetch(url, { signal: combinedSignal });
	} catch (err) {
		clearTimeout(timeoutId);
		if (timeoutCtrl.signal.aborted && !outerSignal?.aborted) {
			throw new Error('Elevation API request timed out');
		}
		throw err;
	} finally {
		clearTimeout(timeoutId);
	}

	if (!response.ok) {
		throw new Error(`Elevation API request failed: ${response.status} ${response.statusText}`);
	}

	const data: unknown = await response.json();

	// Validate the response shape before trusting it.
	if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>).elevation)) {
		throw new Error('Elevation API returned an unexpected response shape');
	}

	const elevations = (data as { elevation: unknown[] }).elevation;
	if (elevations.length !== batch.length) {
		throw new Error(`Elevation API returned ${elevations.length} values for ${batch.length} coordinates`);
	}

	// Coerce each value to a finite number, falling back to 0 for NaN/null.
	return elevations.map((v) => {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	});
}
