// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { CourseData } from './gpx_parser';
import { base64ToString, digestSHA1, stringToBase64 } from './ab';

export type PersistedCourse = {
	id: string;
	name: string;
	notes: string;
	ts: number; // ms
	course: CourseData;
};

export function getCourses(): PersistedCourse[] {
	const courses: PersistedCourse[] = [];

	if (typeof window === 'undefined') {
		return courses;
	}

	for (const i in localStorage) {
		if (i.startsWith('course:')) {
			const v = JSON.parse(localStorage[i]);

			courses.push({
				id: i,
				name: v.name,
				notes: v.notes,
				ts: v.ts,
				course: JSON.parse(base64ToString(v.course)),
			});
		}
	}

	return courses.sort((a, b) => b.ts - a.ts);
}

export async function saveCourse(name: string, notes: string, course: CourseData, ts?: number): Promise<string> {
	const courseStr = JSON.stringify(course);
	const digest = await digestSHA1(`${name}${courseStr}`);
	const id = `course:${digest}`;

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

export function deleteCourse(id: string) {
	if (!id.startsWith('course:')) {
		throw new Error('Not a course');
	}

	localStorage.removeItem(id);
}
