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
	width: '40em',
	height: '30em',
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
	const onClickDiscard = (e: any) => {
		onClose();
	};

	return (
		<MyModal
			title="Edit Ride"
			description="Here you can edit the activity metadata."
			modalStyle={editModalStyle}
			open={open}
			onClose={onClose}
		>
			{open ? (
				<Grid item>
					<form onSubmit={onClickSave}>
						<TextField
							id="act-name"
							label="Activity Name"
							defaultValue={logger.getName()}
							onChange={handleNameChange}
							sx={{
								width: '40ch',
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
