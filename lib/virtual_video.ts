// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import haversine from './haversine';
import { CourseData, Trackpoint } from './gpx_parser';

/** Metadata for a virtual ride video clip as loaded from the remote JSON feed. */
export type VideoClip = {
	title: string;
	gpxUrl: string;
	videoUrl: string;
	copyright: string;
	/** Average cycling speed of the video in km/h, used for the 'average' sync method. */
	avgSpeedKmh?: number;
};

/** How the video playback speed is synchronised with the rider's speed. */
export type SyncMethod = 'average' | 'gps';

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
