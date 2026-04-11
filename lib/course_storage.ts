// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

// Re-export types and the repository singleton from the ORM layer.
export type { PersistedCourse } from './orm/course_repository';
export { courseRepository } from './orm/course_repository';

// ---------------------------------------------------------------------------
// Legacy convenience wrappers — delegate to the ORM repository so all callers
// that still use these functions continue to work.  New code should prefer
// importing from 'lib/orm' directly.
// ---------------------------------------------------------------------------

import type { CourseData } from './gpx_parser';
import { courseRepository } from './orm/course_repository';

export function getCourses() {
	return courseRepository.findAll();
}

export async function saveCourse(name: string, notes: string, course: CourseData, ts?: number): Promise<string> {
	return courseRepository.save(name, notes, course, ts);
}

export function deleteCourse(id: string) {
	courseRepository.delete(id);
}
