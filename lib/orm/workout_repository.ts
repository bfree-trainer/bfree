// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Rider } from '../global';
import { base64ToString, digestSHA1, stringToBase64 } from '../ab';
import generateFTPTest from '../workouts/ftp';

export type WorkoutScript = {
	id: string;
	name: string;
	notes: string;
	ts: number; // ms
	fav?: boolean;
	avatar?: string;
	script: string;
};

/**
 * Repository interface for workout persistence.
 * Implementations may use localStorage, IndexedDB, a remote API, etc.
 */
export interface WorkoutRepository {
	/** Return all stored workouts, favourites first then newest first. */
	findAll(): WorkoutScript[];
	/** Return a single workout by its storage key, or null if not found. */
	findById(id: string): WorkoutScript | null;
	/** Persist a user workout and return its storage key. */
	save(name: string, notes: string, script: string, ts?: number): Promise<string>;
	/** Persist or overwrite a system-generated workout and return its storage key. */
	saveSystem(name: string, notes: string, script: string): Promise<string>;
	/** Regenerate all system workouts for the given rider profile. */
	generateSystemWorkouts(rider: Rider): Promise<void>;
	/** Toggle the favourite flag on a workout. */
	toggleFav(id: string): Promise<void>;
	/** Remove a workout by its storage key. */
	delete(id: string): void;
	/** Return a human-readable date string for a workout's timestamp. */
	formatDate(workout: WorkoutScript): string;
}

// ---------------------------------------------------------------------------
// localStorage implementation
// ---------------------------------------------------------------------------

class LocalStorageWorkoutRepository implements WorkoutRepository {
	private readonly KEY_PREFIX = 'workout:';

	findAll(): WorkoutScript[] {
		const workouts: WorkoutScript[] = [];

		if (typeof window === 'undefined') {
			return workouts;
		}

		for (const key in localStorage) {
			if (key.startsWith(this.KEY_PREFIX)) {
				const v = JSON.parse(localStorage[key]);
				workouts.push({
					id: key,
					name: v.name,
					notes: v.notes,
					ts: v.ts,
					fav: v.fav,
					avatar: v.avatar || 'W',
					script: base64ToString(v.script),
				});
			}
		}

		return workouts.sort((a, b) => +!!b.fav - +!!a.fav || b.ts - a.ts);
	}

	findById(id: string): WorkoutScript | null {
		if (!id.startsWith(this.KEY_PREFIX)) {
			throw new Error('Not a workout');
		}

		const raw = localStorage.getItem(id);
		if (!raw) return null;

		const v = JSON.parse(raw);
		return {
			id,
			name: v.name,
			notes: v.notes,
			ts: v.ts,
			fav: v.fav,
			avatar: v.avatar || 'W',
			script: base64ToString(v.script),
		};
	}

	async save(name: string, notes: string, script: string, ts?: number): Promise<string> {
		const digest = await digestSHA1(name);
		const id = `${this.KEY_PREFIX}${digest}`;

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

	async saveSystem(name: string, notes: string, script: string): Promise<string> {
		const id = `${this.KEY_PREFIX}${name.split(' ').join('').toLowerCase()}`;

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

	async generateSystemWorkouts(rider: Rider): Promise<void> {
		const systemWorkouts: Array<[string, string, string]> = [
			['FTP Test', 'Test your FTP.', generateFTPTest(rider.ftp)],
		];

		await Promise.all(systemWorkouts.map((w) => this.saveSystem(...w)));
	}

	async toggleFav(id: string): Promise<void> {
		if (!id.startsWith(this.KEY_PREFIX)) {
			throw new Error('Not a workout');
		}

		const raw = localStorage.getItem(id);
		if (!raw) return;

		const w = JSON.parse(raw);
		w.fav = !w.fav;

		localStorage.setItem(id, JSON.stringify(w));
	}

	delete(id: string): void {
		if (!id.startsWith(this.KEY_PREFIX)) {
			throw new Error('Not a workout');
		}

		localStorage.removeItem(id);
	}

	formatDate(workout: WorkoutScript): string {
		const date = new Date(workout.ts);
		if (typeof window === 'undefined') return date.toISOString();
		return date.toLocaleDateString([navigator.languages[0], 'en-US'], {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}
}

export const workoutRepository: WorkoutRepository = new LocalStorageWorkoutRepository();
