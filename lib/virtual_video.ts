// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import haversine from './haversine';
import { CourseData, Trackpoint } from './gpx_parser';
import { rollingResistanceCoeff } from './virtual_params';

/** Metadata for a virtual ride video clip as loaded from the remote JSON feed. */
export type VideoClip = {
	title: string;
	/** HTTPS URL of the GPX file describing the route. Optional – enables GPS sync and slope resistance when present. */
	gpxUrl?: string;
	videoUrl: string;
	copyright: string;
	/** Average cycling speed of the video in km/h, used for the 'average' sync method. */
	avgSpeedKmh?: number;
	/**
	 * Road surface of the route.  Controls the rolling resistance sent to the smart trainer.
	 * Valid values: `'WoodenTrack'`, `'Concrete'`, `'AsphaltRoad'`, `'RoughRoad'`.
	 * Defaults to `'AsphaltRoad'` when omitted.
	 */
	roadSurface?: string;
};

/**
 * Predefined road surfaces and their rolling-resistance coefficients.
 * Keys match the `roadSurface` field of the `VideoClip` JSON schema.
 */
export const predefinedRollingResistances: [string, number][] = [
	['WoodenTrack', rollingResistanceCoeff.wood],
	['Concrete', rollingResistanceCoeff.concrete],
	['AsphaltRoad', rollingResistanceCoeff.asphalt],
	['RoughRoad', rollingResistanceCoeff.rough],
];

/**
 * Return the rolling-resistance coefficient for the given road surface name.
 * Falls back to asphalt when the surface is unknown or omitted.
 */
export function getRollingResistanceCoeff(roadSurface?: string): number {
	if (!roadSurface) return rollingResistanceCoeff.asphalt;
	const found = predefinedRollingResistances.find(([name]) => name === roadSurface);
	return found ? found[1] : rollingResistanceCoeff.asphalt;
}

/**
 * How the video playback speed is synchronised with the rider's speed.
 * - `'gps'`     – interpolate original speed from timed GPX trackpoints
 * - `'average'` – scale by ratio of current speed to recorded average speed
 * - `'none'`    – play at constant speed (no sync)
 */
export type SyncMethod = 'average' | 'gps' | 'none';

type TimedTrackpoint = Trackpoint & { time: Date };

/** Flatten all timed trackpoints from a parsed GPX document into a single array. */
export function getTimedTrackpoints(gpx: CourseData): TimedTrackpoint[] {
	const points: TimedTrackpoint[] = [];
	for (const track of gpx.tracks) {
		for (const segment of track.segments) {
			for (const tp of segment.trackpoints) {
				if (tp.time) {
					points.push(tp as TimedTrackpoint);
				}
			}
		}
	}
	return points;
}

/**
 * Compute the playback rate for the video based on the current cyclist speed and the
 * original GPS-recorded speed at the given video timestamp.
 *
 * @param points   Timed trackpoints extracted from the GPX file.
 * @param videoTimeSec  Current video playback position in seconds.
 * @param currentSpeedMs  Current cyclist speed in m/s.
 * @returns  Clamped playback rate (0.1 – 4.0), or null when not enough data.
 */
export function calcGpsPlaybackRate(
	points: TimedTrackpoint[],
	videoTimeSec: number,
	currentSpeedMs: number
): number | null {
	if (points.length < 2) return null;

	const startMs = points[0].time.getTime();
	const targetMs = startMs + videoTimeSec * 1000;

	// Find the segment that contains targetMs
	let idx = 1;
	for (; idx < points.length; idx++) {
		if (points[idx].time.getTime() >= targetMs) break;
	}
	if (idx >= points.length) idx = points.length - 1;

	const prev = points[idx - 1];
	const curr = points[idx];
	const dtSec = (curr.time.getTime() - prev.time.getTime()) / 1000;
	if (dtSec <= 0) return null;

	const distM = haversine([prev.lat, prev.lon], [curr.lat, curr.lon]);
	const originalSpeedMs = distM / dtSec;
	if (originalSpeedMs <= 0) return null;

	const rate = currentSpeedMs / originalSpeedMs;
	return Math.max(0.1, Math.min(4.0, rate));
}

/**
 * Compute the playback rate for the video based on the current cyclist speed and the
 * known average speed of the video.
 *
 * @param avgSpeedKmh  Average speed of the video in km/h.
 * @param currentSpeedMs  Current cyclist speed in m/s.
 * @returns  Clamped playback rate (0.1 – 4.0).
 */
export function calcAveragePlaybackRate(avgSpeedKmh: number, currentSpeedMs: number): number {
	const avgSpeedMs = avgSpeedKmh / 3.6;
	if (avgSpeedMs <= 0) return 1;
	const rate = currentSpeedMs / avgSpeedMs;
	return Math.max(0.1, Math.min(4.0, rate));
}

/**
 * Compute the geographic position (lat/lon) at the current video position by linearly
 * interpolating between the two surrounding timed trackpoints.
 *
 * @param points       Timed trackpoints extracted from the GPX file.
 * @param videoTimeSec Current video playback position in seconds.
 * @returns  `{ lat, lon }` or null when there are not enough points.
 */
export function calcPositionAtVideoTime(
	points: TimedTrackpoint[],
	videoTimeSec: number
): { lat: number; lon: number } | null {
	if (points.length < 2) return null;

	const startMs = points[0].time.getTime();
	const targetMs = startMs + videoTimeSec * 1000;

	let idx = 1;
	for (; idx < points.length; idx++) {
		if (points[idx].time.getTime() >= targetMs) break;
	}
	if (idx >= points.length) idx = points.length - 1;

	const prev = points[idx - 1];
	const curr = points[idx];
	const dtMs = curr.time.getTime() - prev.time.getTime();
	const t = dtMs <= 0 ? 0 : Math.min(1, (targetMs - prev.time.getTime()) / dtMs);

	return {
		lat: prev.lat + t * (curr.lat - prev.lat),
		lon: prev.lon + t * (curr.lon - prev.lon),
	};
}

/**
 * Compute the road grade (%) at the current video position from timed+elevation trackpoints.
 *
 * Uses the same time-to-index algorithm as `calcGpsPlaybackRate`, then derives the grade from
 * the elevation difference between the two surrounding trackpoints.
 *
 * @param points       Timed trackpoints extracted from the GPX file.
 * @param videoTimeSec Current video playback position in seconds.
 * @returns  Grade in percent (clamped to [−20, 20]), or null when elevation data is unavailable.
 */
export function calcSlopeAtVideoTime(points: TimedTrackpoint[], videoTimeSec: number): number | null {
	if (points.length < 2) return null;

	const startMs = points[0].time.getTime();
	const targetMs = startMs + videoTimeSec * 1000;

	let idx = 1;
	for (; idx < points.length; idx++) {
		if (points[idx].time.getTime() >= targetMs) break;
	}
	if (idx >= points.length) idx = points.length - 1;

	const prev = points[idx - 1];
	const curr = points[idx];

	if (prev.ele === undefined || curr.ele === undefined) return null;

	const distM = haversine([prev.lat, prev.lon], [curr.lat, curr.lon]);
	if (distM <= 0) return null;

	const gradePercent = ((curr.ele - prev.ele) / distM) * 100;
	return Math.max(-20, Math.min(20, gradePercent));
}
