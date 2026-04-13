// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Coord } from './gpx_parser';
import type { ActivityLogger } from './orm/ride_repository';

/**
 * Extract all GPS-tracked coordinates from a list of activity log entries.
 * Points without a position are silently skipped.
 */
export function extractAllGpsPoints(rides: ActivityLogger[]): Coord[] {
	const points: Coord[] = [];
	for (const ride of rides) {
		for (const lap of ride.getLaps()) {
			for (const tp of lap.trackPoints) {
				if (tp.position) {
					points.push({ lat: tp.position.lat, lon: tp.position.lon });
				}
			}
		}
	}
	return points;
}

/**
 * Grid resolution in degrees.  At the equator 1° of latitude ≈ 111 km, so
 * 0.001° ≈ 111 m.  At mid-latitudes the east-west cell size shrinks slightly
 * with cos(latitude), but 111 m is a reasonable approximation that keeps
 * adjacent streets in separate cells without being too coarse.
 */
const CELL_SIZE = 0.001;

/**
 * Minimum fractional gap (as a share of the total route length) between two
 * selected popularity waypoints.  15 % ensures that even on a short route the
 * three default waypoints don't cluster together and still provide distinct
 * intermediate anchors for OSRM.
 */
const MIN_T_GAP = 0.15;

/**
 * Find the most popular intermediate waypoints between two coordinates based
 * on historical GPS trackpoints.
 *
 * Algorithm:
 * 1. Build an expanded bounding box around the `from`→`to` segment.
 * 2. Bin all historical points that fall inside the box into a ~100 m grid.
 * 3. Rank cells by visit count and keep those that lie within the corridor
 *    between `from` and `to` (i.e. projected parameter 0 < t < 1).
 * 4. Pick up to `maxWaypoints` well-spread candidates (sorted along the
 *    `from`→`to` direction) and return their grid-cell centres.
 *
 * @param from            - Start coordinate.
 * @param to              - End coordinate.
 * @param historicalPoints - All GPS trackpoints extracted from historical rides.
 * @param maxWaypoints    - Maximum number of intermediate waypoints (default 3).
 * @returns Intermediate waypoints sorted from `from` toward `to`, or an empty
 *          array when there is insufficient historical data.
 */
export function getPopularityWaypoints(
	from: Coord,
	to: Coord,
	historicalPoints: Coord[],
	maxWaypoints = 3
): Coord[] {
	if (historicalPoints.length === 0) return [];

	const latSpan = Math.abs(to.lat - from.lat);
	const lonSpan = Math.abs(to.lon - from.lon);

	// Expand bounding box by 50 % of the span on each side (minimum 0.01 °≈1 km).
	const latPad = Math.max(0.01, latSpan * 0.5);
	const lonPad = Math.max(0.01, lonSpan * 0.5);

	const bbMinLat = Math.min(from.lat, to.lat) - latPad;
	const bbMaxLat = Math.max(from.lat, to.lat) + latPad;
	const bbMinLon = Math.min(from.lon, to.lon) - lonPad;
	const bbMaxLon = Math.max(from.lon, to.lon) + lonPad;

	// Filter to the expanded bounding box first (cheap check before the full grid pass).
	const inBox = historicalPoints.filter(
		(p) => p.lat >= bbMinLat && p.lat <= bbMaxLat && p.lon >= bbMinLon && p.lon <= bbMaxLon
	);
	if (inBox.length === 0) return [];

	// Build a frequency grid.
	type Cell = { count: number; lat: number; lon: number };
	const grid = new Map<string, Cell>();
	for (const p of inBox) {
		const cellLat = Math.floor(p.lat / CELL_SIZE) * CELL_SIZE;
		const cellLon = Math.floor(p.lon / CELL_SIZE) * CELL_SIZE;
		const key = `${cellLat.toFixed(4)},${cellLon.toFixed(4)}`;
		const existing = grid.get(key);
		if (existing) {
			existing.count++;
		} else {
			// Cell centre as representative coordinate.
			grid.set(key, { count: 1, lat: cellLat + CELL_SIZE / 2, lon: cellLon + CELL_SIZE / 2 });
		}
	}

	// Sort by frequency (descending) so we consider the busiest cells first.
	const sorted = Array.from(grid.values()).sort((a, b) => b.count - a.count);

	// Direction vector from `from` to `to` (in lon/lat space).
	const dx = to.lon - from.lon;
	const dy = to.lat - from.lat;
	const length2 = dx * dx + dy * dy;
	if (length2 === 0) return [];

	// Corridor half-width: half the diagonal of the `from`-`to` bounding box,
	// clamped to a minimum of 0.01 ° (≈ 1 km) so short segments still capture
	// nearby popular roads.
	const diagHalf = Math.sqrt(latSpan * latSpan + lonSpan * lonSpan) * 0.5;
	const corridorWidth = Math.max(0.01, diagHalf);

	type Candidate = Cell & { t: number };
	const candidates: Candidate[] = [];

	for (const cell of sorted) {
		const px = cell.lon - from.lon;
		const py = cell.lat - from.lat;

		// Scalar projection onto the from→to unit vector (0 = at `from`, 1 = at `to`).
		const t = (px * dx + py * dy) / length2;

		// Only consider points that lie strictly between the two endpoints.
		if (t <= 0.05 || t >= 0.95) continue;

		// Perpendicular distance from the straight line.
		const perpX = px - t * dx;
		const perpY = py - t * dy;
		const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);

		if (perpDist <= corridorWidth) {
			candidates.push({ ...cell, t });
		}
	}

	if (candidates.length === 0) return [];

	// Greedily pick up to `maxWaypoints` candidates, ensuring they are
	// well-spread along the route (minimum gap of 15 % of the route).
	const selected: Candidate[] = [];

	for (const c of candidates) {
		if (selected.length >= maxWaypoints) break;
		const tooClose = selected.some((s) => Math.abs(s.t - c.t) < MIN_T_GAP);
		if (!tooClose) {
			selected.push(c);
		}
	}

	// Return sorted in route direction.
	selected.sort((a, b) => a.t - b.t);
	return selected.map(({ lat, lon }) => ({ lat, lon }));
}
