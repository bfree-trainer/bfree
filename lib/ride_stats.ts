// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { ActivityType, createActivityLog, TrackPoint } from './activity_log';
import type { Rider } from './global';

export type ZoneDef = {
	name: string;
	label: string;
	color: string;
};

/**
 * Power zones based on % of FTP.
 * Z1 < 55%, Z2 55-74%, Z3 75-89%, Z4 90-104%, Z5 105-119%, Z6 ≥ 120%
 */
export const powerZoneDefs: ZoneDef[] = [
	{ name: 'Z1', label: 'Active Recovery', color: '#9e9e9e' },
	{ name: 'Z2', label: 'Endurance', color: '#42a5f5' },
	{ name: 'Z3', label: 'Tempo', color: '#66bb6a' },
	{ name: 'Z4', label: 'Threshold', color: '#ffa726' },
	{ name: 'Z5', label: 'VO₂ Max', color: '#ef5350' },
	{ name: 'Z6', label: 'Anaerobic', color: '#ab47bc' },
];

/**
 * Heart rate zones based on % of max HR.
 * Z1 < 60%, Z2 60-69%, Z3 70-79%, Z4 80-89%, Z5 ≥ 90%
 */
export const hrZoneDefs: ZoneDef[] = [
	{ name: 'Z1', label: 'Recovery', color: '#9e9e9e' },
	{ name: 'Z2', label: 'Aerobic', color: '#42a5f5' },
	{ name: 'Z3', label: 'Tempo', color: '#66bb6a' },
	{ name: 'Z4', label: 'Threshold', color: '#ffa726' },
	{ name: 'Z5', label: 'Max', color: '#ef5350' },
];

export type ZoneResult = ZoneDef & { seconds: number; pct: number };

export type RideStats = {
	// Power
	avgPower: number | null;
	maxPower: number | null;
	normalizedPower: number | null;
	// Estimated power (populated only when no measured power is available)
	estimatedAvgPower: number | null;
	estimatedMaxPower: number | null;
	estimatedNormalizedPower: number | null;
	// Heart Rate
	avgHR: number | null;
	minHR: number | null;
	maxHR: number | null;
	// Speed
	avgSpeed: number | null; // m/s
	maxSpeed: number | null; // m/s
	// Elevation
	totalAscent: number | null; // meters
	totalDescent: number | null; // meters
	maxElevation: number | null; // meters
	// Temperature
	avgTemp: number | null; // °C
	minTemp: number | null; // °C
	maxTemp: number | null; // °C
	// Effort
	relativeEffort: number | null;
	// Zones
	powerZones: ZoneResult[] | null;
	hrZones: ZoneResult[] | null;
};

// Type guards for required track-point fields
function hasHR(p: TrackPoint): p is TrackPoint & { hr: number } {
	return typeof p.hr === 'number' && !isNaN(p.hr) && p.hr > 0;
}
function hasPower(p: TrackPoint): p is TrackPoint & { power: number } {
	return typeof p.power === 'number' && !isNaN(p.power);
}
function hasSpeed(p: TrackPoint): p is TrackPoint & { speed: number } {
	return typeof p.speed === 'number' && !isNaN(p.speed) && p.speed > 0;
}
function hasAlt(p: TrackPoint): p is TrackPoint & { alt: number } {
	return typeof p.alt === 'number' && !isNaN(p.alt);
}
function hasTemp(p: TrackPoint): p is TrackPoint & { temp: number } {
	return typeof p.temp === 'number' && !isNaN(p.temp);
}

function getPowerZoneIndex(power: number, ftp: number): number {
	const pct = power / ftp;
	if (pct < 0.55) return 0;
	if (pct < 0.75) return 1;
	if (pct < 0.9) return 2;
	if (pct < 1.05) return 3;
	if (pct < 1.2) return 4;
	return 5;
}

function getHRZoneIndex(hr: number, maxHR: number): number {
	const pct = hr / maxHR;
	if (pct < 0.6) return 0;
	if (pct < 0.7) return 1;
	if (pct < 0.8) return 2;
	if (pct < 0.9) return 3;
	return 4;
}

// ── Power estimation constants ────────────────────────────────────────────────
/** Drag coefficient × frontal area (m²) — road bike, hoods position. */
const CDA = 0.32;
/** Air density at sea level, 15 °C (kg/m³). */
const RHO = 1.225;
/** Rolling resistance coefficient — road bike on asphalt. */
const CRR = 0.005;
/** Gravitational acceleration (m/s²). */
const G = 9.81;
/** Drivetrain efficiency (fraction). */
const DRIVETRAIN_EFF = 0.976;

/**
 * Estimate instantaneous cycling power from speed, gradient, and total mass.
 * Uses the standard aerodynamic + rolling + gravitational resistance model.
 * @param speedMs - speed in m/s
 * @param gradient - slope as rise/run (e.g. 0.05 for 5 % grade)
 * @param totalMassKg - combined rider + bike mass in kg
 * @param includeAero - whether to include aerodynamic (wind) resistance (default true; set false for indoor rides)
 */
function estimatePowerAtPoint(speedMs: number, gradient: number, totalMassKg: number, includeAero = true): number {
	const F_aero = includeAero ? 0.5 * CDA * RHO * speedMs * speedMs : 0;
	const F_roll = CRR * totalMassKg * G;
	const F_grav = totalMassKg * G * gradient;
	return Math.max(0, ((F_aero + F_roll + F_grav) * speedMs) / DRIVETRAIN_EFF);
}

/**
 * Build an array of estimated power values for each speed track-point.
 * Gradient is derived from consecutive altitude and distance values when available.
 * @param includeAero - whether to include aerodynamic (wind) resistance
 */
function buildEstimatedPowerPoints(
	speedPoints: Array<TrackPoint & { speed: number }>,
	totalMassKg: number,
	includeAero = true
): Array<TrackPoint & { power: number }> {
	return speedPoints.map((p, i) => {
		let gradient = 0;

		if (i > 0) {
			const prev = speedPoints[i - 1];

			// Prefer recorded cumulative distance; fall back to trapezoidal speed integration.
			let dDist: number;
			if (typeof p.dist === 'number' && typeof prev.dist === 'number' && p.dist > prev.dist) {
				dDist = p.dist - prev.dist;
			} else {
				const dt = (p.time - prev.time) / 1000;
				dDist = ((p.speed + prev.speed) / 2) * dt;
			}

			if (typeof p.alt === 'number' && typeof prev.alt === 'number' && dDist > 0) {
				// Clamp to ±50 % grade to suppress GPS noise.
				gradient = Math.max(-0.5, Math.min(0.5, (p.alt - prev.alt) / dDist));
			}
		}

		return { ...p, power: estimatePowerAtPoint(p.speed, gradient, totalMassKg, includeAero) };
	});
}

function computeNormalizedPower(points: Array<TrackPoint & { power: number }>): number | null {
	if (points.length < 30) return null;

	// Sliding-window sum across a 30-second time span
	const rollingAvgs: number[] = [];
	let windowSum = 0;
	let windowStart = 0;

	for (let i = 0; i < points.length; i++) {
		windowSum += points[i].power;
		while (points[i].time - points[windowStart].time > 30000) {
			windowSum -= points[windowStart].power;
			windowStart++;
		}
		const count = i - windowStart + 1;
		rollingAvgs.push(windowSum / count);
	}

	const meanPow4 = rollingAvgs.reduce((sum, v) => sum + Math.pow(v, 4), 0) / rollingAvgs.length;
	return Math.pow(meanPow4, 0.25);
}

/**
 * Derive per-ride statistics from an activity log and the rider's profile.
 * All fields are null when the relevant data is absent from the log.
 * @param bikeWeightKg - bike mass in kg (defaults to 10 kg when omitted)
 * @param activityType - activity type used to determine whether wind resistance is included
 *                       in estimated power. Wind resistance is only applied for `'road'`
 *                       activities. When omitted, wind resistance is excluded (safe default).
 */
export function computeRideStats(
	logger: ReturnType<typeof createActivityLog>,
	rider: Rider,
	bikeWeightKg = 10,
	activityType?: ActivityType
): RideStats {
	// Wind (aerodynamic) resistance only applies to outdoor road rides.
	const includeAero = activityType === 'road';
	const allPoints = logger.getLaps().flatMap((lap) => lap.trackPoints);

	const nullStats: RideStats = {
		avgPower: null,
		maxPower: null,
		normalizedPower: null,
		estimatedAvgPower: null,
		estimatedMaxPower: null,
		estimatedNormalizedPower: null,
		avgHR: null,
		minHR: null,
		maxHR: null,
		avgSpeed: null,
		maxSpeed: null,
		totalAscent: null,
		totalDescent: null,
		maxElevation: null,
		avgTemp: null,
		minTemp: null,
		maxTemp: null,
		relativeEffort: null,
		powerZones: null,
		hrZones: null,
	};

	if (allPoints.length === 0) return nullStats;

	// ── Power ─────────────────────────────────────────────────────────────────
	const powerPoints = allPoints.filter(hasPower);
	let avgPower: number | null = null;
	let maxPower: number | null = null;
	let normalizedPower: number | null = null;

	if (powerPoints.length > 0) {
		const sum = powerPoints.reduce((s, p) => s + p.power, 0);
		avgPower = Math.round(sum / powerPoints.length);
		maxPower = powerPoints.reduce((m, p) => (p.power > m ? p.power : m), powerPoints[0].power);
		const np = computeNormalizedPower(powerPoints);
		normalizedPower = np !== null ? Math.round(np) : null;
	}

	// ── Heart Rate ────────────────────────────────────────────────────────────
	const hrPoints = allPoints.filter(hasHR);
	let avgHR: number | null = null;
	let minHR: number | null = null;
	let maxHR: number | null = null;

	if (hrPoints.length > 0) {
		avgHR = Math.round(hrPoints.reduce((s, p) => s + p.hr, 0) / hrPoints.length);
		minHR = hrPoints.reduce((m, p) => (p.hr < m ? p.hr : m), hrPoints[0].hr);
		maxHR = hrPoints.reduce((m, p) => (p.hr > m ? p.hr : m), hrPoints[0].hr);
	}

	// ── Speed ─────────────────────────────────────────────────────────────────
	const speedPoints = allPoints.filter(hasSpeed);
	let avgSpeed: number | null = null;
	let maxSpeed: number | null = null;

	if (speedPoints.length > 0) {
		avgSpeed = speedPoints.reduce((s, p) => s + p.speed, 0) / speedPoints.length;
		maxSpeed = speedPoints.reduce((m, p) => (p.speed > m ? p.speed : m), speedPoints[0].speed);
	}

	// ── Elevation ─────────────────────────────────────────────────────────────
	const altPoints = allPoints.filter(hasAlt);
	let totalAscent: number | null = null;
	let totalDescent: number | null = null;
	let maxElevation: number | null = null;

	if (altPoints.length > 0) {
		totalAscent = 0;
		totalDescent = 0;
		maxElevation = altPoints[0].alt;

		for (let i = 1; i < altPoints.length; i++) {
			const diff = altPoints[i].alt - altPoints[i - 1].alt;
			if (diff > 0) {
				totalAscent += diff;
			} else {
				totalDescent += -diff;
			}
			if (altPoints[i].alt > maxElevation!) {
				maxElevation = altPoints[i].alt;
			}
		}
	}

	// ── Temperature ───────────────────────────────────────────────────────────
	const tempPoints = allPoints.filter(hasTemp);
	let avgTemp: number | null = null;
	let minTemp: number | null = null;
	let maxTemp: number | null = null;

	if (tempPoints.length > 0) {
		let sum = 0;
		let min = tempPoints[0].temp;
		let max = tempPoints[0].temp;
		for (const p of tempPoints) {
			sum += p.temp;
			if (p.temp < min) min = p.temp;
			if (p.temp > max) max = p.temp;
		}
		avgTemp = Math.round(sum / tempPoints.length);
		minTemp = Math.round(min);
		maxTemp = Math.round(max);
	}

	// ── Estimated Power (only when no measured power is available) ────────────
	let estimatedAvgPower: number | null = null;
	let estimatedMaxPower: number | null = null;
	let estimatedNormalizedPower: number | null = null;

	if (powerPoints.length === 0 && speedPoints.length > 0) {
		const totalMassKg = rider.weight + bikeWeightKg;
		const estPoints = buildEstimatedPowerPoints(speedPoints, totalMassKg, includeAero);

		const sum = estPoints.reduce((s, p) => s + p.power, 0);
		estimatedAvgPower = Math.round(sum / estPoints.length);
		estimatedMaxPower = Math.round(estPoints.reduce((m, p) => (p.power > m ? p.power : m), estPoints[0].power));

		const np = computeNormalizedPower(estPoints);
		estimatedNormalizedPower = np !== null ? Math.round(np) : null;
	}

	// ── Power Zones ───────────────────────────────────────────────────────────
	let powerZones: ZoneResult[] | null = null;

	if (powerPoints.length > 0 && rider.ftp > 0) {
		const zoneSecs = new Array<number>(powerZoneDefs.length).fill(0);

		for (let i = 1; i < powerPoints.length; i++) {
			const dt = (powerPoints[i].time - powerPoints[i - 1].time) / 1000;
			// Ignore gaps longer than 10 s (pause / reconnect)
			if (dt > 0 && dt <= 10) {
				zoneSecs[getPowerZoneIndex(powerPoints[i].power, rider.ftp)] += dt;
			}
		}

		const totalSecs = zoneSecs.reduce((s, v) => s + v, 0);
		powerZones = powerZoneDefs.map((def, i) => ({
			...def,
			seconds: zoneSecs[i],
			pct: totalSecs > 0 ? (zoneSecs[i] / totalSecs) * 100 : 0,
		}));
	}

	// ── HR Zones ──────────────────────────────────────────────────────────────
	let hrZones: ZoneResult[] | null = null;

	if (hrPoints.length > 0 && rider.heartRate.max > 0) {
		const zoneSecs = new Array<number>(hrZoneDefs.length).fill(0);

		for (let i = 1; i < hrPoints.length; i++) {
			const dt = (hrPoints[i].time - hrPoints[i - 1].time) / 1000;
			if (dt > 0 && dt <= 10) {
				zoneSecs[getHRZoneIndex(hrPoints[i].hr, rider.heartRate.max)] += dt;
			}
		}

		const totalSecs = zoneSecs.reduce((s, v) => s + v, 0);
		hrZones = hrZoneDefs.map((def, i) => ({
			...def,
			seconds: zoneSecs[i],
			pct: totalSecs > 0 ? (zoneSecs[i] / totalSecs) * 100 : 0,
		}));
	}

	// ── Relative Effort ───────────────────────────────────────────────────────
	// Weighted time-in-HR-zone approach (points per minute):
	// Z1=0, Z2=1, Z3=2, Z4=4, Z5=7
	let relativeEffort: number | null = null;

	if (hrZones) {
		const weights = [0, 1, 2, 4, 7];
		const raw = hrZones.reduce((sum, zone, i) => sum + (zone.seconds / 60) * weights[i], 0);
		relativeEffort = Math.round(raw);
	}

	return {
		avgPower,
		maxPower,
		normalizedPower,
		estimatedAvgPower,
		estimatedMaxPower,
		estimatedNormalizedPower,
		avgHR,
		minHR,
		maxHR,
		avgSpeed,
		maxSpeed,
		totalAscent,
		totalDescent,
		maxElevation,
		avgTemp,
		minTemp,
		maxTemp,
		relativeEffort,
		powerZones,
		hrZones,
	};
}
