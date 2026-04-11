// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Veloviewer-style explorer tiles.
 *
 * Tiles are based on the standard OpenStreetMap tile grid at zoom level 14
 * (256×256 px tiles).  Any activity trackpoint that falls inside a tile marks
 * that tile as "visited".  The max square is the largest N×N block of
 * contiguous visited tiles.
 *
 * References:
 *  - https://wiki.openstreetmap.org/wiki/Zoom_levels
 *  - https://blog.veloviewer.com/veloviewer-explorer-score-and-max-square/
 */

/** OSM zoom level used for explorer tiles (matches Veloviewer / Statshunter). */
export const EXPLORER_ZOOM = 14;

/**
 * Convert geographic coordinates to OSM tile coordinates at the given zoom.
 * Returns integer tile indices [tileX, tileY].
 */
export function latLonToTile(lat: number, lon: number, zoom: number = EXPLORER_ZOOM): [number, number] {
	const n = Math.pow(2, zoom);
	const tileX = Math.floor(((lon + 180) / 360) * n);
	const latRad = (lat * Math.PI) / 180;
	const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
	return [tileX, tileY];
}

/** Geographic bounding box for a tile. */
export interface TileBounds {
	north: number;
	south: number;
	west: number;
	east: number;
}

/**
 * Convert tile coordinates back to geographic bounds.
 * In OSM tiling, tile Y increases southward, so tile (tx, ty) has its
 * north edge at ty and south edge at ty+1.
 */
export function tileToBounds(tx: number, ty: number, zoom: number = EXPLORER_ZOOM): TileBounds {
	const n = Math.pow(2, zoom);
	const west = (tx / n) * 360 - 180;
	const east = ((tx + 1) / n) * 360 - 180;
	const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n)));
	const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + 1)) / n)));
	return {
		north: (northRad * 180) / Math.PI,
		south: (southRad * 180) / Math.PI,
		west,
		east,
	};
}

/**
 * Collect all unique OSM tiles visited by the given tracks.
 * Each tile is represented as a "tileX,tileY" string key.
 */
export function collectVisitedTiles(tracks: [number, number][][], zoom: number = EXPLORER_ZOOM): Set<string> {
	const tiles = new Set<string>();
	for (const track of tracks) {
		for (const [lat, lon] of track) {
			const [tx, ty] = latLonToTile(lat, lon, zoom);
			tiles.add(`${tx},${ty}`);
		}
	}
	return tiles;
}

/** Position and size of the max square in tile coordinates. */
export interface MaxSquare {
	/** X (column) of the top-left tile of the square. */
	minX: number;
	/** Y (row) of the top-left tile of the square. */
	minY: number;
	/** Side length of the square in tiles. */
	size: number;
}

/**
 * Find the largest square of fully-visited contiguous tiles using a classic
 * dynamic-programming approach (O(rows × cols) time).
 *
 * Returns null when there are no visited tiles.
 */
export function findMaxSquare(tiles: Set<string>): MaxSquare | null {
	if (tiles.size === 0) return null;

	const coords = Array.from(tiles).map((s) => {
		const [x, y] = s.split(',').map(Number);
		return [x, y] as [number, number];
	});

	const minX = Math.min(...coords.map(([x]) => x));
	const maxX = Math.max(...coords.map(([x]) => x));
	const minY = Math.min(...coords.map(([, y]) => y));
	const maxY = Math.max(...coords.map(([, y]) => y));

	const width = maxX - minX + 1;
	const height = maxY - minY + 1;

	// dp[row][col] = side length of the largest all-visited square whose
	// bottom-right corner (in row-major order, y increasing downward) is
	// at this cell.
	const dp: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

	let bestSize = 0;
	// Bottom-right tile coordinates of the best square found so far.
	let bestTileX = minX;
	let bestTileY = minY;

	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			const tx = minX + col;
			const ty = minY + row;
			if (!tiles.has(`${tx},${ty}`)) continue;

			if (row === 0 || col === 0) {
				dp[row][col] = 1;
			} else {
				dp[row][col] = Math.min(dp[row - 1][col], dp[row][col - 1], dp[row - 1][col - 1]) + 1;
			}

			if (dp[row][col] > bestSize) {
				bestSize = dp[row][col];
				bestTileX = tx;
				bestTileY = ty;
			}
		}
	}

	if (bestSize === 0) return null;

	// The top-left tile of the best square:
	return {
		minX: bestTileX - bestSize + 1,
		minY: bestTileY - bestSize + 1,
		size: bestSize,
	};
}
