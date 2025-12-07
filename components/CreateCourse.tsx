// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState, useRef } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export default function CreateCourseDialog({ newCourse }: { newCourse: (name: string, file: File) => void }) {
	const nameRef = useRef();
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const [open, setOpen] = useState(false);
	const handleClickOpen = () => {
		setOpen(true);
	};
	const handleCreate = () => {
		// @ts-ignore
		newCourse(nameRef?.current?.value || '', uploadInputRef.current?.files[0] || null);
		setOpen(false);
	};
	const handleCancel = () => {
		setOpen(false);
	};

	return (
		<>
			<Button variant="contained" onClick={handleClickOpen}>
				New Course
			</Button>
			<Dialog open={open} onClose={handleCancel}>
				<DialogTitle>New Course</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ width: '25em' }}>
						Course name can be read from the imported file by leaving the name field blank.
					</DialogContentText>
					<Stack spacing={3}>
						<TextField
							autoFocus
							margin="dense"
							id="name"
							label="Course Name"
							fullWidth
							variant="standard"
							inputRef={nameRef}
						/>
						<InputLabel htmlFor="import-file" hidden>
							<input ref={uploadInputRef} id="import-file" name="import-file" type="file" />
							GPX
						</InputLabel>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button color="secondary" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleCreate}>Create</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
