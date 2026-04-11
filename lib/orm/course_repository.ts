// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { CourseData } from '../gpx_parser';
import { base64ToString, digestSHA1, stringToBase64 } from '../ab';

export type { CourseData };

export type PersistedCourse = {
	id: string;
	name: string;
	notes: string;
	ts: number; // ms
	course: CourseData;
};

/**
 * Repository interface for course persistence.
 * Implementations may use localStorage, IndexedDB, a remote API, etc.
 */
export interface CourseRepository {
	/** Return all stored courses, newest first. */
	findAll(): PersistedCourse[];
	/** Return a single course by its storage key, or null if not found. */
	findById(id: string): PersistedCourse | null;
	/** Persist a new course and return its generated storage key. */
	save(name: string, notes: string, course: CourseData, ts?: number): Promise<string>;
	/** Remove a course by its storage key. */
	delete(id: string): void;
}

// ---------------------------------------------------------------------------
// localStorage implementation
// ---------------------------------------------------------------------------

class LocalStorageCourseRepository implements CourseRepository {
	private readonly KEY_PREFIX = 'course:';

	findAll(): PersistedCourse[] {
		const courses: PersistedCourse[] = [];

		if (typeof window === 'undefined') {
			return courses;
		}

		for (const key in localStorage) {
			if (key.startsWith(this.KEY_PREFIX)) {
				const v = JSON.parse(localStorage[key]);
				courses.push({
					id: key,
					name: v.name,
					notes: v.notes,
					ts: v.ts,
					course: JSON.parse(base64ToString(v.course)),
				});
			}
		}

		return courses.sort((a, b) => b.ts - a.ts);
	}

	findById(id: string): PersistedCourse | null {
		if (!id.startsWith(this.KEY_PREFIX)) {
			throw new Error('Not a course id');
		}

		const raw = localStorage.getItem(id);
		if (!raw) return null;

		const v = JSON.parse(raw);
		return {
			id,
			name: v.name,
			notes: v.notes,
			ts: v.ts,
			course: JSON.parse(base64ToString(v.course)),
		};
	}

	async save(name: string, notes: string, course: CourseData, ts?: number): Promise<string> {
		const courseStr = JSON.stringify(course);
		const digest = await digestSHA1(`${name}${courseStr}`);
		const id = `${this.KEY_PREFIX}${digest}`;

		localStorage.setItem(
			id,
			JSON.stringify({
				name,
				notes,
				ts: ts ?? Date.now(),
				course: await stringToBase64(courseStr),
			})
		);

		return id;
	}

	delete(id: string): void {
		if (!id.startsWith(this.KEY_PREFIX)) {
			throw new Error('Not a course');
		}

		localStorage.removeItem(id);
	}
}

export const courseRepository: CourseRepository = new LocalStorageCourseRepository();
