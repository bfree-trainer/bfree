// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import WorkoutPreviewModal from 'components/WorkoutPreview';
import WorkoutScriptEditor from 'components/WorkoutScriptEditor';
import { saveWorkout, readWorkout } from 'lib/workout_storage';
import scriptExample from 'lib/workouts/workout_script_example';

const defaultName = 'My Workout';
const defaultNotes = 'This is just an example.';

export default function RideWorkoutEdit() {
	const router = useRouter();
	const { id } = router.query;
	const [name, setName] = useState(defaultName);
	const [notes, setNotes] = useState(defaultNotes);
	const [workoutScript, setWorkoutScript] = useState(scriptExample);
	const [showPreview, setShowPreview] = useState(false);

	useEffect(() => {
		if (!router.isReady) return;

		if (typeof id === 'string') {
			const w = readWorkout(id);
			if (!w) {
				router.push('not_found');
			} else {
				setName(w.name);
				setNotes(w.notes);
				setWorkoutScript(w.script);
				console.log(`Loaded workout script: ${id}`);
			}
		}
	}, [router.isReady, id]); // eslint-disable-line react-hooks/exhaustive-deps

	const onClickSave = (e: any, name: string, notes: string) => {
		saveWorkout(name, notes, workoutScript)
			.catch(console.error) // TODO Show an error???
			.then(() => router.push('/ride/workout'));
	};
	const onClickDiscard = (e: any) => {
		router.push('/ride/workout');
	};

	return (
		<Container maxWidth="md">
			<MyHead title="Edit Workout" />
			<Box>
				<Title disableBack={true}>Edit Workout</Title>
				<p>Create or edit a workout.</p>

				<Grid container direction="row" spacing={2}>
					<WorkoutScriptEditor
						code={workoutScript}
						onCodeChange={setWorkoutScript}
						defaultName={name}
						defaultNotes={notes}
						onClickSave={onClickSave}
						onClickDiscard={onClickDiscard}
						onClickPreview={() => setShowPreview(true)}
					/>
				</Grid>
			</Box>
			<WorkoutPreviewModal code={workoutScript} open={showPreview} onClose={() => setShowPreview(false)} />
		</Container>
	);
}
