// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, useEffect } from 'react';
import EditActionButtons from './EditActionButtons';

const PREFIX = 'WorkoutScriptEditor';
const classes = {
	editor: `${PREFIX}-editor`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.editor}`]: {
		overflow: 'scroll',
		fontFamily: '"Fira code", "Fira Mono", monospace',
		fontSize: 12,
	},
}));

export default function WorkoutScriptEditor({
	defaultName,
	defaultNotes,
	code,
	onCodeChange,
	onClickSave,
	onClickDiscard,
	onClickPreview,
}: {
	defaultName: string;
	defaultNotes: string;
	code: string;
	onCodeChange: (txt: string) => void;
	onClickSave: (e: any, name: string, notes: string) => void;
	onClickDiscard: (e: any) => void;
	onClickPreview: (e: any) => void;
}) {
	const [name, setName] = useState(defaultName);
	const [notes, setNotes] = useState(defaultNotes);
	const handleChange = (e) => onCodeChange(e.target.value);

	useEffect(() => {
		setName(defaultName);
	}, [defaultName]);
	useEffect(() => {
		setNotes(defaultNotes);
	}, [defaultNotes]);

	return (
		<StyledGrid item xs={12}>
			<Card variant="outlined">
				<CardContent sx={{ height: '45em' }}>
					<Typography gutterBottom variant="h5" component="h2">
						Workout Script
					</Typography>
					<EditActionButtons
						onClickSave={(e: any) => onClickSave(e, name, notes)}
						onClickDiscard={onClickDiscard}
						onClickPreview={onClickPreview}
					/>
					<form>
						<TextField
							id="act-name"
							label="Name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							sx={{ marginBottom: '1em' }}
						/>
						<TextField
							id="act-notes"
							label="Notes"
							multiline
							rows={2}
							fullWidth
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							variant="outlined"
							sx={{ marginBottom: '1em' }}
						/>
						<TextField
							label="Script"
							multiline
							fullWidth
							rows={19}
							variant="outlined"
							margin="none"
							value={code}
							onChange={handleChange}
							InputProps={{
								classes: {
									input: classes.editor,
								},
							}}
						/>
					</form>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
