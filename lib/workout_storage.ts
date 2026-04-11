// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

// Re-export types and the repository singleton from the ORM layer.
export type { WorkoutScript } from './orm/workout_repository';
export { workoutRepository } from './orm/workout_repository';

// ---------------------------------------------------------------------------
// Legacy convenience wrappers — delegate to the ORM repository so all callers
// that still use these functions continue to work.  New code should prefer
// importing from 'lib/orm' directly.
// ---------------------------------------------------------------------------

import type { Rider } from './global';
import { workoutRepository } from './orm/workout_repository';
import type { WorkoutScript } from './orm/workout_repository';

export function getWorkouts(): WorkoutScript[] {
	return workoutRepository.findAll();
}

export function getWorkoutDate(workout: WorkoutScript) {
	return workoutRepository.formatDate(workout);
}

export async function generateSystemWorkouts(rider: Rider): Promise<void> {
	return workoutRepository.generateSystemWorkouts(rider);
}

export async function saveSystemWorkout(name: string, notes: string, script: string): Promise<string> {
	return workoutRepository.saveSystem(name, notes, script);
}

export async function saveWorkout(name: string, notes: string, script: string, ts?: number): Promise<string> {
	return workoutRepository.save(name, notes, script, ts);
}

export async function toggleWorkoutFav(id: string): Promise<void> {
	return workoutRepository.toggleFav(id);
}

export function readWorkout(id: string): WorkoutScript {
	return workoutRepository.findById(id);
}

export function deleteWorkout(id: string): void {
	workoutRepository.delete(id);
}
