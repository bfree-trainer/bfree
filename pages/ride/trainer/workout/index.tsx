// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Avatar from '@mui/material/Avatar';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid';
import IconAdd from '@mui/icons-material/Add';
import IconBike from '@mui/icons-material/DirectionsBike';
import IconButton from '@mui/material/IconButton';
import IconFavorite from '@mui/icons-material/Favorite';
import IconMoreVert from '@mui/icons-material/MoreVert';
import IconDownload from '@mui/icons-material/GetApp';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { red } from '@mui/material/colors';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useGlobalState } from 'lib/global';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import WarningDialog from 'components/WarningDialog';
import downloadBlob from 'lib/download_blob';
import { workoutRepository } from 'lib/orm';
import type { WorkoutScript } from 'lib/orm';

const PREFIX = 'index';
const classes = {
	cardRoot: `${PREFIX}-cardRoot`,
	fab: `${PREFIX}-fab`,
	media: `${PREFIX}-media`,
	expand: `${PREFIX}-expand`,
	expandOpen: `${PREFIX}-expandOpen`,
	avatar: `${PREFIX}-avatar`,
};

const StyledContainer = styled(Container)(({ theme }) => ({
	[`& .${classes.cardRoot}`]: {
		width: '100%',
		maxWidth: 345,
	},

	[`& .${classes.fab}`]: {
		display: 'flex',
		marginLeft: 'auto',
		marginRight: 'auto',
		marginBottom: '2em',
		marginTop: '2em',
	},

	[`& .${classes.media}`]: {
		height: 0,
		paddingTop: '56.25%', // 16:9
	},

	[`& .${classes.expand}`]: {
		transform: 'rotate(0deg)',
		marginLeft: 'auto',
		transition: theme.transitions.create('transform', {
			duration: theme.transitions.duration.shortest,
		}),
	},

	[`& .${classes.expandOpen}`]: {
		transform: 'rotate(180deg)',
	},

	[`& .${classes.avatar}`]: {
		backgroundColor: red[500],
	},
}));

function WorkoutCard({ workout, onChange }) {
	const router = useRouter();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [showWarning, setShowWarning] = useState(false);
	const [btDevice_smart_trainer] = useGlobalState('btDevice_smart_trainer');
	const [smartTrainerControl] = useGlobalState('smart_trainer_control');
	const hasTrainer = !!btDevice_smart_trainer || !!smartTrainerControl;
	const href = useMemo(() => `/ride/trainer/record?type=workout&id=${workout.id}`, [workout.id]);

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};
	const handleEdit = () => {
		setAnchorEl(null);
		router.push(`/ride/trainer/workout/edit?id=${workout.id}`);
	};
	const handleDelete = () => {
		setAnchorEl(null);
		workoutRepository.delete(workout.id);
		onChange();
	};
	const handleDownload = () => {
		const notes = workout.notes
			.split('\n')
			.map((s: string) => `// ${s}`)
			.join('\n');
		const blob = new Blob([notes, '\n\n', workout.script], { type: 'text/javascript' });

		downloadBlob(blob, `${workout.name}.js`);
	};
	const handleFav = () => {
		workoutRepository.toggleFav(workout.id).catch(console.error).then(onChange());
	};
	const handleRide = (e) => {
		if (!hasTrainer) {
			e.preventDefault();
			setShowWarning(true);
		} else {
			router.push(href);
		}
	};
	const handleCancel = () => {
		setShowWarning(false);
	};
	const handleContinue = () => {
		setShowWarning(false);
		router.push(href);
	};

	return (
		<Grid item xs={10}>
			<Card variant="outlined" className={classes.cardRoot}>
				<CardHeader
					avatar={
						<Avatar aria-label="workout" className={classes.avatar}>
							{workout.avatar || 'W'}
						</Avatar>
					}
					action={
						workout.ts !== 0 ? (
							<div>
								<IconButton aria-label="workout options" onClick={handleMenuClick} size="large">
									<IconMoreVert />
								</IconButton>
								<Menu
									id={`edit-menu-${workout.id}`}
									anchorEl={anchorEl}
									keepMounted
									open={!!anchorEl}
									onClose={handleClose}
								>
									<MenuItem onClick={handleEdit}>Edit</MenuItem>
									<MenuItem onClick={handleDelete}>Delete</MenuItem>
								</Menu>
							</div>
						) : (
							''
						)
					}
					title={workout.name}
					subheader={workout.ts != 0 ? workoutRepository.formatDate(workout) : ''}
				/>
				{/* TODO Add preview here */}
				<CardContent>
					<Typography variant="body2" color="textSecondary" component="p">
						{workout.notes}
					</Typography>
				</CardContent>
				<CardActions disableSpacing>
					<IconButton
						aria-label="add to favorites"
						color={workout.fav ? 'secondary' : undefined}
						onClick={handleFav}
						size="large"
					>
						<IconFavorite />
					</IconButton>
					<IconButton aria-label="download" onClick={handleDownload} size="large">
						<IconDownload />
					</IconButton>
					<IconButton aria-label="Ride" onClick={handleRide} size="large">
						<IconBike />
					</IconButton>
				</CardActions>
				<WarningDialog
					title={'Continue without a smart trainer?'}
					show={showWarning}
					handleCancel={handleCancel}
					handleContinue={handleContinue}
				>
					Without a trainer, the workout can&apos;t adjust resistance automatically.
				</WarningDialog>
			</Card>
		</Grid>
	);
}

export default function Workout() {
	const router = useRouter();
	const [rider] = useGlobalState('rider');
	const [workouts, setWorkouts] = useState<WorkoutScript[]>(() => workoutRepository.findAll());
	const handleChange = () => setWorkouts(workoutRepository.findAll());

	// Get the workouts when we enter this page;
	// Otherwise we'd show stale data after an edit.
	// Interestingly there is a short delay
	useEffect(() => {
		workoutRepository
			.generateSystemWorkouts(rider)
			.then(() => setWorkouts(workoutRepository.findAll()))
			.catch(console.error);
	}, [rider]);

	return (
		<StyledContainer maxWidth="sm">
			<MyHead title="Workout" />
			<Box>
				<Title href="/ride/trainer">Workout</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Create and run structured workouts.
				</Typography>

				<Grid container direction="column" alignItems="center" spacing={2}>
					{workouts.map((w) => (
						<WorkoutCard workout={w} onChange={handleChange} key={w.id} />
					))}
				</Grid>
				<Fab
					color="primary"
					aria-label="add"
					className={classes.fab}
					onClick={() => router.push('/ride/trainer/workout/edit')}
				>
					<IconAdd />
				</Fab>
			</Box>
		</StyledContainer>
	);
}
