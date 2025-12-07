// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import IconCancel from '@mui/icons-material/Cancel';
import IconSave from '@mui/icons-material/Save';
import IconTimeLine from '@mui/icons-material/Timeline';

export default function EditActionButtons({
	onClickSave,
	onClickDiscard,
	onClickPreview,
}: {
	onClickSave?: (e: any) => void;
	onClickDiscard?: (e: any) => void;
	onClickPreview?: (e: any) => void;
}) {
	const actionsStyle = {
		'> *': {
			boxShadow: 'none',
			margin: '3pt',
			marginBottom: '1.5ex',
			marginTop: '1.5ex',
		},
		marginBottom: '1em',
		textAlign: 'right',
	};

	return (
		<Container sx={actionsStyle}>
			{onClickSave ? (
				<Fab size="small" color="primary" aria-label="save" onClick={onClickSave}>
					<IconSave />
				</Fab>
			) : (
				''
			)}
			{onClickDiscard ? (
				<Fab size="small" color="secondary" aria-label="discard" onClick={onClickDiscard}>
					<IconCancel />
				</Fab>
			) : (
				''
			)}
			{onClickPreview ? (
				<Fab size="small" variant="extended" aria-label="preview" onClick={onClickPreview}>
					<IconTimeLine />
					Preview
				</Fab>
			) : (
				''
			)}
		</Container>
	);
}
