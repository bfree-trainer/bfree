// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { TrainerMeasurements } from '../measurements';
import { getGlobalState } from '../global';

type EmulatorMode = 'basic' | 'power' | 'slope';

export type EmulatorState = {
	mode: EmulatorMode;
	basicResistance: number; // 0–100 %
	targetPower: number; // watts
	grade: number; // %
	rollingResistanceCoeff: number;
	virtualSpeedMs: number; // m/s – controlled by the overlay
};

// Module-level state shared between the emulator and the overlay component.
let state: EmulatorState = {
	mode: 'basic',
	basicResistance: 0,
	targetPower: 100,
	grade: 0,
	rollingResistanceCoeff: 0.004,
	virtualSpeedMs: 0,
};

export function getEmulatorState(): Readonly<EmulatorState> {
	return state;
}

export function setEmulatorVirtualSpeed(speedMs: number) {
	state.virtualSpeedMs = Math.max(0, speedMs);
}

type PageListener = (data: any) => void;

export function createTrainerEmulator(measurementsCb: (res: TrainerMeasurements) => void) {
	// Reset shared state so a fresh emulator starts clean.
	state = {
		mode: 'basic',
		basicResistance: 0,
		targetPower: 100,
		grade: 0,
		rollingResistanceCoeff: 0.004,
		virtualSpeedMs: 0,
	};

	const pageListeners: { [page: number]: PageListener[] } = {};

	let intervalId: ReturnType<typeof setInterval> | null = null;
	let accumulatedPower = 0;
	let accumulatedDistanceM = 0;

	const computeMeasurements = (): TrainerMeasurements => {
		const rider = getGlobalState('rider');
		const bike = getGlobalState('bike');

		const riderMass = (rider?.weight ?? 70) + (bike?.weight ?? 10); // kg
		const g = 9.81;
		const rho = 1.225; // kg/m³ air density
		const CdA = 0.3; // m² drag area

		const v = state.virtualSpeedMs; // m/s

		let power = 0;
		switch (state.mode) {
			case 'basic': {
				// Rough model: rolling + induced drag proportional to resistance setting
				const Frr = (state.basicResistance / 100) * riderMass * g * 0.2;
				const Fwind = 0.5 * rho * CdA * v * v;
				power = Math.max(0, (Frr + Fwind) * v);
				break;
			}
			case 'power':
				// The trainer maintains target power; just report it.
				power = state.targetPower;
				break;
			case 'slope': {
				const slope = state.grade / 100;
				const Fslope = riderMass * g * slope;
				const Frr = state.rollingResistanceCoeff * riderMass * g;
				const Fwind = 0.5 * rho * CdA * v * v;
				power = Math.max(0, (Fslope + Frr + Fwind) * v);
				break;
			}
		}

		// Approximate cadence from speed using wheel circumference and a typical gear ratio.
		const wheelCircumferenceM = (bike?.wheelCircumference ?? 2097) / 1000; // m
		const assumedGearRatio = 2.5;
		const cadence = v > 0 ? Math.round((v / wheelCircumferenceM / assumedGearRatio) * 60) : 0;

		accumulatedPower = (accumulatedPower + Math.round(power)) & 0xffff;
		accumulatedDistanceM = (accumulatedDistanceM + v) & 0xffffff; // ~16 km before rollover

		return {
			ts: Date.now(),
			speed: v,
			instantPower: Math.round(power),
			power: Math.round(power),
			accumulatedPower,
			cadence,
			accumulatedDistance: Math.round(accumulatedDistanceM),
			powerLimits: 0,
			calStatus: {
				powerCalRequired: false,
				resistanceCalRequired: false,
				userConfigRequired: false,
			},
		};
	};

	const start = () => {
		if (intervalId !== null) return;
		intervalId = setInterval(() => {
			measurementsCb(computeMeasurements());
		}, 1000);
	};

	const stop = () => {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};

	const addPageListener = (page: number, cb: PageListener) => {
		if (!pageListeners[page]) pageListeners[page] = [];
		pageListeners[page].push(cb);
	};

	const removePageListener = (page: number, cb: PageListener) => {
		const list = pageListeners[page];
		if (list) {
			const i = list.indexOf(cb);
			if (i > -1) list.splice(i, 1);
		}
	};

	const dispatchPage = (page: number, data: any) => {
		(pageListeners[page] ?? []).forEach((cb) => cb(data));
	};

	return {
		txCharacteristic: null as any,
		rxCharacteristic: null as any,
		startNotifications: async () => {
			start();
		},
		sendBasicResistance: async (value: number) => {
			state.mode = 'basic';
			state.basicResistance = value;
		},
		sendTargetPower: async (value: number) => {
			state.mode = 'power';
			state.targetPower = value;
		},
		sendWindResistance: async (_wrc: number, _ws: number, _df: number) => {},
		sendSlope: async (gradeP: number, rollingResistanceCoeff: number) => {
			state.mode = 'slope';
			state.grade = gradeP;
			state.rollingResistanceCoeff = rollingResistanceCoeff;
		},
		sendUserConfiguration: async (_cfg: {
			userWeightKg: number;
			bikeWeightKg: number;
			wheelCircumference: number;
		}) => {},
		sendCalibrationReset: async () => {},
		sendCalibrationReq: async () => {
			// Simulate a successful spin-down calibration after a short delay.
			setTimeout(() => {
				dispatchPage(1, {
					spinDownCalRes: true,
					zeroOffsetCalRes: true,
					temperature: 20,
					zeroOffsetRes: 0,
					spindownTimeRes: 2000,
				});
			}, 2000);
		},
		sendCalibrationCancel: async () => {},
		sendPageReq: async (_page: number) => {},
		addPageListener,
		removePageListener,
		stop,
	};
}
