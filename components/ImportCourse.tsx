// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState, useRef, ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export default function ImportCourseDialog({ newCourse }: { newCourse: (name: string, file: File) => void }) {
	const nameRef = useRef();
	const [file, setFile] = useState(null);
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const handleClickOpen = () => {
		setOpen(true);
	};
	const handleSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
		console.log(e.target.files)
		setFile(e?.target?.files[0] ?? null);
	};
	const handleCreate = () => {
		if (!file) return;
		setCreating(true);
		// @ts-ignore
		newCourse(nameRef?.current?.value || '', file);
		setOpen(false);
		setCreating(false);
	};
	const handleCancel = () => {
		setOpen(false);
	};

	return (
		<>
			<Button variant="contained" onClick={handleClickOpen}>
				Import
			</Button>
			<Dialog open={open} onClose={handleCancel}>
				<DialogTitle>Import Course</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ maxWidth: '25em' }}>
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
							inputProps={{ maxLength: 200 }}
						/>
						<InputLabel htmlFor="import-file" hidden>
							<input
								id="import-file"
								name="import-file"
								type="file"
								accept=".gpx,.GPX"
								onChange={handleSelectFile}
							/>
							GPX
						</InputLabel>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button color="secondary" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={creating || !file}>
						Create
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
