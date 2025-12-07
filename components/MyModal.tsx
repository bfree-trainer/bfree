// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { styled } from '@mui/material/styles';
import Modal, { ModalProps } from '@mui/material/Modal';

const PREFIX = 'MyModal';
const classes = {
	paper: `${PREFIX}-paper`,
};
const paperTop = 50;
const paperLeft = 50;

const StyledDiv = styled('div')(({ theme }) => ({
	[`&.${classes.paper}`]: {
		position: 'absolute',
		top: `${paperTop}%`,
		left: `${paperLeft}%`,
		transform: `translate(-${paperTop}%, -${paperLeft}%)`,
		backgroundColor: theme.palette.background.paper,
		border: '2px solid #000',
		boxShadow: theme.shadows[5],
		padding: theme.spacing(2, 4, 3),
	},
}));

const defaultModalStyle = {
	width: '80vw',
	height: '68vh',
};

export default function MyModal(
	props: { title: string; description: string; modalStyle?: any; children: any } & Omit<ModalProps, 'children'>
) {
	const { title, description, open, onClose, modalStyle, children, ...rest } = props;

	return (
		<Modal
			open={open}
			onClose={onClose}
			{...rest}
			aria-labelledby="modal-title"
			aria-describedby="modal-description"
		>
			<StyledDiv style={modalStyle || defaultModalStyle} className={classes.paper}>
				<h2 id="modal-title">{title}</h2>
				<p id="modal-description">{description}</p>
				{children}
			</StyledDiv>
		</Modal>
	);
}
