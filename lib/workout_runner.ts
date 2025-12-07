// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LapTriggerMethod } from './activity_log';

export type RunnerMessage = {
	time: number; // ms
	distance: number; // m
	speed: number; // m/s
	cadence: number;
	heartRate: number;
	power: number;
	// TODO other measurements
};

export type RunnerResponse = {
	time: number; // sec
	message?: string; // Message shown to the rider
	doSplit?: LapTriggerMethod; // add a split
	doStop?: boolean | string; // stop the workout
	basicLoad?: number;
	power?: number;
	slope?: number;
	// TODO wind, road params
};

export default function createWorkoutRunner(script: string) {
	if (typeof script !== 'string') {
		throw new Error('Workout script must be a string');
	}

	const blob = new Blob([script]);
	const blobURL = window.URL.createObjectURL(blob);
	const worker = new Worker(blobURL);

	return {
		/**
		 * Terminate the workout runner.
		 */
		terminate: () => worker.terminate(),

		/**
		 * Send a message to the workout runner.
		 */
		sendMessage: (msg: RunnerMessage) => worker.postMessage(msg),

		/**
		 * Register a callback to receive response messages from the workout
		 * runner.
		 */
		onMessage: (cb: (msg: RunnerResponse) => void) => (worker.onmessage = (e) => cb(e.data)),
	};
}
