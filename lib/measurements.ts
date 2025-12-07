// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { GlobalState, SensorSourceType, getGlobalState, useGlobalState } from './global';

export type Measurement = 'cycling_cadence' | 'cycling_power' | 'cycling_speed' | 'heart_rate';

type MeasurementBase = {
	ts: number; // ms
};

export type CscMeasurements = MeasurementBase & {
	cumulativeWheelRevolutions: number | null;
	lastWheelEvent: number | null;
	cumulativeCrankRevolutions: number | null;
	lastCrankEvent: number | null;
	speed: number | null;
	cadence: number | null;
};

export type CppMeasurements = MeasurementBase & {
	cumulativeWheelRevolutions: number | null;
	lastWheelEvent: number | null;
	power: number | null; // Watts
	speed: number | null; // m/s
};

export type TrainerMeasurements = MeasurementBase & {
	elapsedTime?: number;
	speed?: number;
	instantPower?: number;
	power?: number;
	accumulatedPower?: number;
	cadence?: number;
	accumulatedDistance?: number;
	heartRate?: number;
	powerLimits?: 0 | 1 | 2 | 3; // 0 = at target/not set; 1 = too low power; 2 = too high power; 3 = undetermined
	calStatus: {
		powerCalRequired: boolean;
		resistanceCalRequired: boolean;
		userConfigRequired: boolean;
	};
};

export type HrmMeasurements = MeasurementBase & {
	heartRate: number;
	contactDetected?: boolean;
	energyExpended?: number;
	rrIntervals?: number[];
};

// TODO Skip sensor if the data is stale?
function useMeasurement(sources: keyof GlobalState, predicate: (m: CscMeasurements | CppMeasurements) => boolean) {
	const srcArr = getGlobalState(sources);
	const v = srcArr
		.map((v: SensorSourceType) => v.id)
		.map(useGlobalState)
		.find((m: any) => predicate(m[0]));
	if (v) {
		return v[0];
	}
	return null;
}

function getMeasurement(sources: keyof GlobalState, predicate: (m: CscMeasurements | CppMeasurements) => boolean) {
	const srcArr = getGlobalState(sources);
	return (
		srcArr
			.map((v: SensorSourceType) => v.id)
			.map(getGlobalState)
			.find((m: any) => predicate(m)) || null
	);
}

export function useCyclingCadenceMeasurement(): CscMeasurements | null {
	return useMeasurement('cadenceSources', (d: CscMeasurements) => d && d.cadence !== null && d.cadence !== undefined);
}

export function getCyclingCadenceMeasurement(): CscMeasurements | null {
	return getMeasurement('cadenceSources', (d: CscMeasurements) => d && d.cadence !== null && d.cadence !== undefined);
}

export function useCyclingPowerMeasurement() {
	return useMeasurement('powerSources', (d: CppMeasurements) => d && d.power !== null && d.power !== undefined);
}

export function getCyclingPowerMeasurement() {
	return getMeasurement('powerSources', (d: CppMeasurements) => d && d.power !== null && d.power !== undefined);
}

export function useCyclingSpeedMeasurement(): CscMeasurements | TrainerMeasurements | null {
	return useMeasurement('speedSources', (d: CscMeasurements) => d && d.speed !== null && d.speed !== undefined);
}

export function getCyclingSpeedMeasurement(): CscMeasurements | TrainerMeasurements | null {
	return getMeasurement('speedSources', (d: CscMeasurements) => d && d.speed !== null && d.speed !== undefined);
}

export function useHeartRateMeasurement(): HrmMeasurements | null {
	// Currently we only support one source for heart rate.
	return useGlobalState('heart_rate')[0];
}

export function getHeartRateMeasurement(): HrmMeasurements | null {
	// Currently we only support one source for heart rate.
	return getGlobalState('heart_rate');
}

export function useMeasurementByType(type: Measurement) {
	// TODO Try to avoid disabling that eslint rule
	switch (type) {
		case 'cycling_cadence':
			// eslint-disable-next-line react-hooks/rules-of-hooks
			return useCyclingCadenceMeasurement();
		case 'cycling_power':
			// eslint-disable-next-line react-hooks/rules-of-hooks
			return useCyclingPowerMeasurement();
		case 'cycling_speed':
			// eslint-disable-next-line react-hooks/rules-of-hooks
			return useCyclingSpeedMeasurement();
		case 'heart_rate':
			// eslint-disable-next-line react-hooks/rules-of-hooks
			return useHeartRateMeasurement();
	}
}
