import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { ReactNode } from 'react';
import SxPropsTheme from 'lib/SxPropsTheme';

const style: SxPropsTheme = {
	position: 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: 400,
	bgcolor: 'background.paper',
	border: '2px solid #000',
	boxShadow: 24,
	p: 4,
	textAlign: 'center',
};

export default function PauseModal({
	show,
	onClose,
	children,
}: {
	show: boolean;
	onClose: () => void;
	children: ReactNode;
}) {
	return (
		<Modal
			aria-labelledby="pause-modal-title"
			aria-describedby="pause-modal-description"
			open={show}
			onClose={onClose}
			closeAfterTransition
			BackdropComponent={Backdrop}
			BackdropProps={{
				timeout: 500,
			}}
		>
			<Box sx={style}>
				<h2 id="pause-modal-title">Ride Paused</h2>
				{children}
			</Box>
		</Modal>
	);
}
