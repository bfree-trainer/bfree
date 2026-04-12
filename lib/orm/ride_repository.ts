// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createActivityLog } from '../activity_log';
import { formatLongDate } from '../locale';

export type ActivityLogger = ReturnType<typeof createActivityLog>;

export type RideEntry = {
	id: string;
	ts: number;
	date: string;
	logger: ActivityLogger;
};

export class RideAlreadyExistsError extends Error {
	constructor(id: string) {
		super(`Ride already exists: ${id}`);
		this.name = 'RideAlreadyExistsError';
	}
}

/**
 * Repository interface for ride (activity log) persistence.
 * Implementations may use localStorage, IndexedDB, a remote API, etc.
 */
export interface RideRepository {
	/** Return all stored rides, newest first. */
	findAll(): RideEntry[];
	/** Return the most recent `n` rides, newest first. */
	findLastN(n: number): RideEntry[];
	/** Return all rides whose start time falls within [start, end] (inclusive), newest first. */
	findBetween(start: Date, end: Date): RideEntry[];
	/** Persist or update a ride. */
	save(logger: ActivityLogger): void;
	/** Persist a new ride. Throws RideAlreadyExistsError if the key already exists. */
	saveNew(logger: ActivityLogger): void;
	/** Remove a ride by its storage key. */
	delete(id: string): void;
}

// ---------------------------------------------------------------------------
// localStorage implementation
// ---------------------------------------------------------------------------

class LocalStorageRideRepository implements RideRepository {
	private readonly KEY_PREFIX = 'activity_log:';

	findAll(): RideEntry[] {
		const arr: RideEntry[] = [];

		if (typeof window === 'undefined') {
			return arr;
		}

		for (const key in localStorage) {
			if (key.startsWith(this.KEY_PREFIX)) {
				const logger = createActivityLog('trainerFreeRide');
				logger.importJson(localStorage[key]);

				const ts = logger.getStartTime();
				arr.push({ id: key, ts, date: formatLongDate(ts), logger });
			}
		}

		return arr.sort((a, b) => b.ts - a.ts);
	}

	findLastN(n: number): RideEntry[] {
		return this.findAll().slice(0, n);
	}

	findBetween(start: Date, end: Date): RideEntry[] {
		const from = start.getTime();
		const to = end.getTime();
		return this.findAll().filter((entry) => entry.ts >= from && entry.ts <= to);
	}

	save(logger: ActivityLogger): void {
		const date = logger.getStartTimeISO();

		if (!date) {
			throw new Error('Save failed: activity log has no start time');
		}

		localStorage.setItem(`${this.KEY_PREFIX}${date}`, logger.json());
	}

	saveNew(logger: ActivityLogger): void {
		const date = logger.getStartTimeISO();

		if (!date) {
			throw new Error('Save failed: activity log has no start time');
		}

		const key = `${this.KEY_PREFIX}${date}`;
		if (localStorage.getItem(key) !== null) {
			throw new RideAlreadyExistsError(key);
		}

		localStorage.setItem(key, logger.json());
	}

	delete(id: string): void {
		if (!id.startsWith(this.KEY_PREFIX)) {
			throw new Error(`Invalid activity log ID: must start with "${this.KEY_PREFIX}"`);
		}

		localStorage.removeItem(id);
	}
}

export const rideRepository: RideRepository = new LocalStorageRideRepository();
