// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import { ChangeEvent, useState } from 'react';
import { exportConfig, importConfig } from 'lib/global';
import downloadBlob from 'lib/download_blob';

const VisuallyHiddenInput = styled('input')({
	clip: 'rect(0 0 0 0)',
	clipPath: 'inset(50%)',
	height: 1,
	overflow: 'hidden',
	position: 'absolute',
	bottom: 0,
	left: 0,
	whiteSpace: 'nowrap',
	width: 1,
});

function ImportJsonCard() {
	const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

	const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files[0];

		if (!file) {
			setStatus({ type: 'error', message: 'No file selected.' });
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			try {
				importConfig(reader.result as string);
				setStatus({ type: 'success', message: 'Settings imported successfully.' });
			} catch {
				setStatus({ type: 'error', message: 'Invalid settings file.' });
			}
		};
		reader.onerror = () => {
			setStatus({ type: 'error', message: 'Could not read the file.' });
		};
		reader.readAsText(file);
	};

	return (
		<Grid item xs={12} sm={6} md={4}>
			<Card variant="outlined">
				<CardContent>
					<Typography gutterBottom variant="h5" component="h2">
						Import Settings
					</Typography>
					{status && (
						<Alert severity={status.type} onClose={() => setStatus(null)}>
							{status.message}
						</Alert>
					)}
				</CardContent>
				<CardActions sx={{ display: 'flex', justifyContent: 'flex-end' }}>
					<Button component="label" variant="contained">
						Import
						<VisuallyHiddenInput type="file" onChange={handleImport} />
					</Button>
				</CardActions>
			</Card>
		</Grid>
	);
}

function handleExport() {
	const filename = 'bfree_settings.json';
	const blob = new Blob([exportConfig()], { type: 'application/json' });
	downloadBlob(blob, filename);
}

function ExportJsonCard() {
	return (
		<Grid item xs={12} sm={6} md={4}>
			<Card variant="outlined">
				<CardContent>
					<Typography gutterBottom variant="h5" component="h2">
						Export Settings
					</Typography>
				</CardContent>
				<CardActions sx={{ display: 'flex', justifyContent: 'flex-end' }}>
					<Button variant="contained" onClick={handleExport}>
						Export
					</Button>
				</CardActions>
			</Card>
		</Grid>
	);
}

export default function Json() {
	return (
		<Container maxWidth="md">
			<MyHead title="General" />
			<Box>
				<Title href="/setup">Import/Export</Title>
				<p>Import or export settings.</p>

				<Grid container direction="row" alignItems="flex-start" spacing={2}>
					<ImportJsonCard />
					<ExportJsonCard />
				</Grid>
			</Box>
		</Container>
	);
}
