// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Coord } from './gpx_parser';

/**
 * OSRM public demo server endpoint.
 * For production deployments consider hosting your own OSRM instance:
 * https://project-osrm.org/
 */
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

/**
 * Get a routed path between two or more waypoints using OSRM with the bicycle
 * profile.  The bicycle profile respects one-way streets and prefers bike
 * lanes based on OpenStreetMap data.
 *
 * @param waypoints - At least two coordinates to route between.
 * @returns Array of route coordinates (including all intermediate points).
 * @throws Error if the routing request fails or returns no routes.
 */
export async function getOsrmRoute(waypoints: Coord[]): Promise<Coord[]> {
	if (waypoints.length < 2) {
		return waypoints;
	}

	const coords = waypoints.map(({ lat, lon }) => `${lon},${lat}`).join(';');
	const url = `${OSRM_BASE_URL}/bicycle/${coords}?overview=full&geometries=geojson`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`OSRM routing request failed: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	if (data.code !== 'Ok' || !data.routes?.length) {
		throw new Error(`OSRM routing failed: ${data.message ?? data.code}`);
	}

	return (data.routes[0].geometry.coordinates as [number, number][]).map(([lon, lat]) => ({
		lat,
		lon,
	}));
}
