// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function WarningDialog({
	title,
	show,
	handleCancel,
	handleContinue,
	children: message,
}: {
	title: string;
	show: boolean;
	handleCancel: () => void;
	handleContinue: () => void;
	children?: any;
}) {
	return (
		<Dialog
			open={show}
			onClose={handleCancel}
			aria-labelledby="alert-dialog-title"
			aria-describedby="alert-dialog-description"
		>
			<DialogTitle id="alert-dialog-title">{title}</DialogTitle>
			<DialogContent>
				<DialogContentText id="alert-dialog-description">{message || ''}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleCancel} color="primary">
					Cancel
				</Button>
				<Button onClick={handleContinue} color="primary" autoFocus>
					Continue
				</Button>
			</DialogActions>
		</Dialog>
	);
}
