// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { createActivityLog, saveActivityLog } from 'lib/activity_log';
import EditActionButtons from 'components/EditActionButtons';
import MyModal from 'components/MyModal';

const editModalStyle = {
	width: '90vw',
	maxWidth: '40em',
	height: 'auto',
	maxHeight: '90vh',
	overflowY: 'auto' as const,
};

export default function EditModal({
	open,
	onClose,
	logger,
}: {
	open: boolean;
	onClose: () => void;
	logger: ReturnType<typeof createActivityLog>;
}) {
	const [newName, setNewName] = useState(() => logger.getName());
	const [newNotes, setNewNotes] = useState(() => logger.getNotes());

	const handleNameChange = (e) => {
		setNewName(e.target.value);
	};
	const handleNotesChange = (e) => {
		setNewNotes(e.target.value);
	};
	const onClickSave = () => {
		logger.setName(newName);
		logger.setNotes(newNotes);
		saveActivityLog(logger);
		onClose();
	};
	const onClickDiscard = () => {
		onClose();
	};

	return (
		<MyModal
			title="Edit Ride"
			description="Edit the name and notes for this ride."
			modalStyle={editModalStyle}
			open={open}
			onClose={onClose}
		>
			{open ? (
				<Grid item>
					<form onSubmit={onClickSave}>
						<TextField
							id="act-name"
							label="Ride Name"
							defaultValue={logger.getName()}
							onChange={handleNameChange}
							fullWidth
							sx={{
								maxWidth: '40ch',
								pb: '2.5em',
							}}
						/>
						<br />
						<TextField
							id="act-notes"
							label="Notes"
							multiline
							rows={4}
							defaultValue={logger.getNotes()}
							onChange={handleNotesChange}
							variant="outlined"
							fullWidth
							sx={{
								pb: '2.5em',
							}}
						/>
						<EditActionButtons onClickSave={onClickSave} onClickDiscard={onClickDiscard} />
					</form>
				</Grid>
			) : (
				''
			)}
		</MyModal>
	);
}
