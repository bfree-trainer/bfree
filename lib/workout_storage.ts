// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Rider } from './global';
import { base64ToString, digestSHA1, stringToBase64 } from './ab';
import generateFTPTest from './workouts/ftp';

export type WorkoutScript = {
	id: string;
	name: string;
	notes: string;
	ts: number; // ms
	fav?: boolean;
	avatar?: string;
	script: string;
};

export function getWorkouts(): WorkoutScript[] {
	const workouts = [];

	if (typeof window === 'undefined') {
		return workouts;
	}

	for (let i in localStorage) {
		if (i.startsWith('workout:')) {
			const v = JSON.parse(localStorage[i]);

			workouts.push({
				id: i,
				name: v.name,
				notes: v.notes,
				ts: v.ts,
				fav: v.fav,
				avatar: v.avatar || 'W',
				script: base64ToString(v.script),
			});
		}
	}

	return workouts.sort((a, b) => b.fav - a.fav || b.ts - a.ts);
}

export function getWorkoutDate(workout: WorkoutScript) {
	const date = new Date(workout.ts);

	return date.toLocaleDateString([navigator.languages[0], 'en-US'], {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

export async function generateSystemWorkouts(rider: Rider) {
	const systemWorkouts: Array<[string, string, string]> = [
		['FTP Test', 'Test your FTP.', generateFTPTest(rider.ftp)],
	];

	await Promise.all(systemWorkouts.map((w) => saveSystemWorkout(...w)));
}

export async function saveSystemWorkout(name: string, notes: string, script: string): Promise<string> {
	const id = `workout:${name.split(' ').join('').toLowerCase()}`;

	localStorage.setItem(
		id,
		JSON.stringify({
			name,
			notes,
			ts: 0,
			avatar: 'T',
			script: await stringToBase64(script),
		})
	);

	return id;
}

export async function saveWorkout(name: string, notes: string, script: string, ts?: number): Promise<string> {
	const digest = await digestSHA1(name);
	const id = `workout:${digest}`;

	localStorage.setItem(
		id,
		JSON.stringify({
			name,
			notes,
			ts: ts ?? Date.now(),
			script: await stringToBase64(script),
		})
	);

	return id;
}

export async function toggleWorkoutFav(id: string) {
	if (!id.startsWith('workout:')) {
		throw new Error('Not a workout');
	}

	const raw = localStorage.getItem(id);

	if (!raw) {
		return null;
	}

	const w = JSON.parse(raw);
	w.fav = !w.fav;

	localStorage.setItem(id, JSON.stringify(w));
}

export function readWorkout(id: string): WorkoutScript {
	if (!id.startsWith('workout:')) {
		throw new Error('Not a workout');
	}

	const raw = localStorage.getItem(id);

	if (!raw) {
		return null;
	}

	const w = JSON.parse(raw);

	return {
		id,
		name: w.name,
		notes: w.notes,
		ts: w.ts,
		fav: w.fav,
		avatar: w.avatar || 'W',
		script: base64ToString(w.script),
	};
}

export function deleteWorkout(id: string) {
	if (!id.startsWith('workout:')) {
		throw new Error('Not a workout');
	}

	localStorage.removeItem(id);
}
