// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { OutlinedInputProps } from '@mui/material';

export default function ExportCard({
	defaultName,
	onChangeName,
	defaultNotes,
	onChangeNotes,
	onClickTCX,
}: {
	defaultName: string;
	onChangeName: OutlinedInputProps['onChange'];
	defaultNotes: string;
	onChangeNotes: OutlinedInputProps['onChange'];
	onClickTCX: () => void;
}) {
	return (
		<Grid item xs={4}>
			<Card variant="outlined">
				<CardContent>
					<Typography gutterBottom variant="h5" component="h2">
						Activity Info
					</Typography>
					<TextField
						id="act-name"
						label="Activity Name"
						defaultValue={defaultName}
						onChange={onChangeName}
						sx={{ paddingBottom: '2.5em' }}
					/>
					<TextField
						id="act-notes"
						label="Notes"
						multiline
						rows={4}
						defaultValue={defaultNotes || ''}
						onChange={onChangeNotes}
						variant="outlined"
					/>
				</CardContent>
				<CardActions sx={{ display: 'flex', justifyContent: 'flex-end' }}>
					<Button variant="contained" onClick={onClickTCX}>
						Export TCX
					</Button>
				</CardActions>
			</Card>
		</Grid>
	);
}
