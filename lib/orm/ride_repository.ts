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
	/**
	 * Resolves when the repository has finished initialising and any data
	 * migration has completed.  Read/write methods work synchronously via an
	 * in-memory cache once this promise resolves.
	 */
	readonly ready: Promise<void>;
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
// IndexedDB implementation (replaces the old localStorage implementation)
//
// localStorage has a hard ~5-10 MB per-origin quota.  Importing hundreds of
// GPX/FIT rides easily exceeds that limit, causing silent QuotaExceededError
// failures.  IndexedDB is quota-managed by the browser against available disk
// space and is therefore suitable for storing many large activity logs.
//
// Design:
//  - An in-memory Map<key, jsonString> mirrors every IndexedDB record so that
//    all read methods remain synchronous (no API change required).
//  - Write methods update the in-memory cache immediately (synchronous) and
//    then fire-and-forget the corresponding IndexedDB transaction.
//  - On first construction the `ready` promise handles:
//      1. Opening / creating the IndexedDB database.
//      2. One-time migration of any existing `activity_log:*` entries from
//         localStorage into IndexedDB (so existing user data is preserved).
//      3. Loading every IndexedDB record into the in-memory cache.
// ---------------------------------------------------------------------------

const DB_NAME = 'bfree';
const DB_VERSION = 1;
const STORE_NAME = 'activity_logs';
const KEY_PREFIX = 'activity_log:';

class IndexedDbRideRepository implements RideRepository {
	private cache = new Map<string, string>();
	private db: IDBDatabase | null = null;

	readonly ready: Promise<void>;

	constructor() {
		this.ready = this.init();
	}

	private init(): Promise<void> {
		if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
			// SSR or environments without IndexedDB – stay empty.
			return Promise.resolve();
		}
		return this.openDb()
			.then((db) => {
				this.db = db;
				return this.migrateFromLocalStorage();
			})
			.then(() => this.loadCache());
	}

	private openDb(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME);
				}
			};
			req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
			req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
		});
	}

	/** Copy all activity_log:* entries from localStorage into IndexedDB (runs once). */
	private migrateFromLocalStorage(): Promise<void> {
		if (!this.db) return Promise.resolve();

		// Collect entries to migrate
		const entries: [string, string][] = [];
		for (const key in localStorage) {
			if (key.startsWith(KEY_PREFIX)) {
				entries.push([key, localStorage[key]]);
			}
		}
		if (entries.length === 0) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const tx = this.db.transaction(STORE_NAME, 'readwrite');
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
			const store = tx.objectStore(STORE_NAME);
			for (const [key, value] of entries) {
				// put() overwrites any existing entry, ensuring idempotent migration.
				store.put(value, key);
			}
		});
	}

	/** Populate the in-memory cache from IndexedDB. */
	private loadCache(): Promise<void> {
		if (!this.db) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const tx = this.db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const req = store.openCursor();
			req.onsuccess = (e) => {
				const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					this.cache.set(cursor.key as string, cursor.value as string);
					cursor.continue();
				} else {
					resolve();
				}
			};
			req.onerror = () => reject(req.error);
		});
	}

	private jsonToEntry(key: string, json: string): RideEntry {
		const logger = createActivityLog('trainerFreeRide');
		logger.importJson(json);
		const ts = logger.getStartTime();
		return { id: key, ts, date: formatLongDate(ts), logger };
	}

	findAll(): RideEntry[] {
		const arr: RideEntry[] = [];
		for (const [key, json] of this.cache) {
			arr.push(this.jsonToEntry(key, json));
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
		if (!date) throw new Error('Save failed: activity log has no start time');

		const key = `${KEY_PREFIX}${date}`;
		const json = logger.json();
		this.cache.set(key, json);

		if (this.db) {
			const tx = this.db.transaction(STORE_NAME, 'readwrite');
			tx.onerror = () => console.error('IndexedDB save failed:', tx.error);
			tx.objectStore(STORE_NAME).put(json, key);
		}
	}

	saveNew(logger: ActivityLogger): void {
		const date = logger.getStartTimeISO();
		if (!date) throw new Error('Save failed: activity log has no start time');

		const key = `${KEY_PREFIX}${date}`;
		if (this.cache.has(key)) {
			throw new RideAlreadyExistsError(key);
		}

		const json = logger.json();
		this.cache.set(key, json);

		if (this.db) {
			const tx = this.db.transaction(STORE_NAME, 'readwrite');
			tx.onerror = () => console.error('IndexedDB saveNew failed:', tx.error);
			tx.objectStore(STORE_NAME).put(json, key);
		}
	}

	delete(id: string): void {
		if (!id.startsWith(KEY_PREFIX)) {
			throw new Error(`Invalid activity log ID: must start with "${KEY_PREFIX}"`);
		}

		this.cache.delete(id);

		if (this.db) {
			const tx = this.db.transaction(STORE_NAME, 'readwrite');
			tx.onerror = () => console.error('IndexedDB delete failed:', tx.error);
			tx.objectStore(STORE_NAME).delete(id);
		}
	}
}

export const rideRepository: RideRepository = new IndexedDbRideRepository();
