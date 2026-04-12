// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import dynamic from 'next/dynamic';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import IconDelete from '@mui/icons-material/Delete';
import IconDownload from '@mui/icons-material/GetApp';
import IconExpandMore from '@mui/icons-material/ExpandMore';
import IconMoreVert from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, styled } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import BottomNavi from 'components/BottomNavi';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import EditRideModal from 'components/EditRideModal';
import RideStatsPanel from 'components/RideStatsPanel';
import downloadBlob from 'lib/download_blob';
import { gpxToActivityLog, fitToActivityLog } from 'lib/activity_log';
import type { ActivityType } from 'lib/activity_log';
import { rideRepository } from 'lib/orm';
import { gpxDocument2obj, parseGpxFile2Document } from 'lib/gpx_parser';
import { parseFitFile } from 'lib/fit_parser';
import { getElapsedTimeStr } from 'lib/format';
import { smartDistanceUnitFormat } from 'lib/units';
import { useGlobalState } from 'lib/global';
import type RideMiniMapType from 'components/map/RideMiniMap';

type RideMiniMapArgs = Parameters<typeof RideMiniMapType>[0];
const DynamicRideMiniMap = dynamic<RideMiniMapArgs>(() => import('components/map/RideMiniMap'), {
	ssr: false,
});
const DataGraph = dynamic(() => import('components/DataGraph'), { ssr: false });

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

const PREFIX = 'history';
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

const FlexParent = styled('div')({
	margin: 0,
	padding: 0,
	display: 'flex',
	flexDirection: 'row',
});

const Flex = styled('div')({
	margin: 0,
	padding: 0,
	flex: '1 1',
	position: 'relative',
});

const RideStatsUl = styled('ul')({
	margin: 0,
	padding: 0,
	alignItems: 'stretch',
	display: 'flex',
	flexFlow: 'row wrap',
	listStyle: 'none',
	paddingLeft: 0,
	marginBottom: 0,
	marginTop: 0,
});

const RideStatsLi = styled('li')(({ theme }) => ({
	listStyle: 'none',
	margin: 0,
	padding: 5,
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'flex-end',
	borderRight: `1px solid ${theme.palette.divider}`,
}));

const RideStatsLiLast = styled('li')({
	listStyle: 'none',
	margin: 0,
	padding: 5,
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'flex-end',
});

import type { RideEntry } from 'lib/orm';

type Log = RideEntry;

function RideStats({ stats }: { stats: [string, string][] }) {
	const last = stats.length - 1;
	return (
		<FlexParent>
			<Flex>
				<RideStatsUl>
					{stats.map((stat, i) =>
						i < last ? (
							<RideStatsLi key={i}>
								<Typography variant="caption">{stat[0]}</Typography>
								<Typography variant="body1">{stat[1]}</Typography>
							</RideStatsLi>
						) : (
							<RideStatsLiLast key={i}>
								<Typography variant="caption">{stat[0]}</Typography>
								<Typography variant="body1">{stat[1]}</Typography>
							</RideStatsLiLast>
						)
					)}
				</RideStatsUl>
			</Flex>
		</FlexParent>
	);
}

interface ExpandMoreProps extends IconButtonProps {
	expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
	const { expand, ...other } = props;
	return <IconButton {...other} />;
})(({ theme }) => ({
	marginLeft: 'auto',
	transition: theme.transitions.create('transform', {
		duration: theme.transitions.duration.shortest,
	}),
	variants: [
		{
			props: ({ expand }) => !expand,
			style: {
				transform: 'rotate(0deg)',
			},
		},
		{
			props: ({ expand }) => !!expand,
			style: {
				transform: 'rotate(180deg)',
			},
		},
	],
}));

function getActivityTypeLabel(type: ActivityType): string {
	switch (type) {
		case 'trainerFreeRide':
			return 'Free Ride';
		case 'trainerWorkout':
			return 'Workout';
		case 'trainerMap':
			return 'Map Ride';
		case 'trainerVirtual':
			return 'Virtual Ride';
		case 'road':
			return 'Road Ride';
		default:
			return 'Ride';
	}
}

function isTrainerActivity(type: ActivityType): boolean {
	return type === 'trainerFreeRide' || type === 'trainerWorkout' || type === 'trainerMap' || type === 'trainerVirtual';
}

function RideCard({ log, onSelect }: { log: Log; onSelect: (v: boolean) => void }) {
	const distanceUnit = useGlobalState('unitDistance')[0];
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const name = log.logger.getName();
	const rideTime = log.logger.getTotalTime();
	const rideDistance = log.logger.getTotalDistance();
	const calories = log.logger.getTotalCalories();
	const notes = log.logger.getNotes();
	const activityType = log.logger.getActivityType();

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};
	const handleEdit = () => {
		setAnchorEl(null);
		setShowEditModal(true);
	};
	const handleDownload = () => {
		const { logger } = log;
		const filename = `${logger.getStartTimeISO().slice(0, 10)}_${logger.getName()}.tcx`;
		const xmlLines: string[] = [];

		logger.tcx((line: string) => xmlLines.push(line));
		const blob = new Blob(xmlLines, { type: 'application/vnd.garmin.tcx+xml' });

		downloadBlob(blob, filename);
	};

	const handleExpandClick = () => {
		setExpanded(!expanded);
	};

	return (
		<Grid item sx={{ width: '100%', maxWidth: 400 }}>
			<Card variant="outlined" className={classes.cardRoot}>
				<CardHeader
					avatar={
						<Avatar aria-label="ride" className={classes.avatar}>
							{log.logger.getAvatar()}
						</Avatar>
					}
					action={
						<div>
							<IconButton aria-label="ride options" onClick={handleMenuClick} size="large">
								<IconMoreVert />
							</IconButton>
							<Menu
								id={`edit-menu-${log.id}`}
								anchorEl={anchorEl}
								keepMounted
								open={!!anchorEl}
								onClose={handleClose}
							>
								<MenuItem onClick={handleEdit}>Edit</MenuItem>
							</Menu>
						</div>
					}
					title={name}
					subheader={
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.25 }}>
							{log.date}
							<Box sx={{ display: 'flex', gap: 0.5 }}>
								{isTrainerActivity(activityType) && <Chip label="Trainer" size="small" variant="outlined" />}
								<Chip label={getActivityTypeLabel(activityType)} size="small" variant="outlined" />
							</Box>
						</Box>
					}
					titleTypographyProps={{ noWrap: true }}
				/>
				{/* Minimap showing ride route if GPS location data is available */}
				<DynamicRideMiniMap logger={log.logger} />
				<CardContent>
					<RideStats
						stats={[
							['Distance', smartDistanceUnitFormat(distanceUnit, rideDistance)],
							['Time', getElapsedTimeStr(rideTime)],
							['Calories', `${calories}`],
						]}
					/>
					<Typography variant="body2" color="textSecondary" component="p">
						{notes}
					</Typography>
				</CardContent>
				<Collapse in={expanded} timeout="auto" unmountOnExit>
					<CardContent>
						<DataGraph logger={log.logger} type="full" isInteractive={true} />
					</CardContent>
				</Collapse>
				<CardActions disableSpacing>
					<IconButton aria-label="download" onClick={handleDownload} size="large">
						<IconDownload />
					</IconButton>
					<Checkbox
						color="default"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelect(e.target.checked)}
					/>
					<ExpandMore
						expand={expanded}
						onClick={handleExpandClick}
						aria-expanded={expanded}
						aria-label={expanded ? 'Hide ride details' : 'Show ride details'}
					>
						<IconExpandMore />
					</ExpandMore>
				</CardActions>
			</Card>
			<EditRideModal open={showEditModal} onClose={() => setShowEditModal(false)} logger={log.logger} />
		</Grid>
	);
}

export default function History() {
	const theme = useTheme();
	const isBreakpoint = useMediaQuery(theme.breakpoints.up('md'));
	const [logs, setLogs] = useState<RideEntry[]>([]);
	const selectionRef = useRef(new WeakMap<Log, boolean>());
	const [selectionCount, setSelectionCount] = useState(0);
	const [snackMsg, setSnackMsg] = useState<string | null>(null);

	const massDeletion = () => {
		const q = logs.filter((log) => selectionRef.current.has(log));
		setSelectionCount(selectionCount - q.length); // RFE Will this go out of sync if deletion fails?
		q.forEach(({ id }) => {
			rideRepository.delete(id);
		});
		setLogs(rideRepository.findAll());
	};

	const handleImportGpx = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		// Reset so selecting the same file(s) again still triggers onChange
		e.target.value = '';
		if (files.length === 0) return;

		const promises = files.map((file) =>
			parseGpxFile2Document(file)
				.then((xmlDoc) => {
					const gpxData = gpxDocument2obj(xmlDoc);
					const logger = gpxToActivityLog(gpxData);
					if (!logger) return false;
					rideRepository.save(logger);
					return true;
				})
				.catch(() => false)
		);

		Promise.all(promises).then((results) => {
			setLogs(rideRepository.findAll());
			const imported = results.filter(Boolean).length;
			const failed = results.length - imported;
			if (files.length === 1) {
				if (imported === 1) {
					setSnackMsg('GPX file imported successfully.');
				} else {
					setSnackMsg('No trackpoints found in the GPX file.');
				}
			} else {
				const parts: string[] = [];
				if (imported > 0) parts.push(`${imported} File${imported !== 1 ? 's' : ''} imported`);
				if (failed > 0) parts.push(`${failed} failed`);
				setSnackMsg(parts.join(', ') + '.');
			}
		});
	};

	const handleImportFit = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		// Reset so selecting the same file(s) again still triggers onChange
		e.target.value = '';
		if (files.length === 0) return;

		const promises = files.map((file) =>
			parseFitFile(file)
				.then((fitData) => {
					const logger = fitToActivityLog(fitData, file.name.replace(/\.fit$/i, ''));
					if (!logger) return false;
					rideRepository.save(logger);
					return true;
				})
				.catch(() => false)
		);

		Promise.all(promises).then((results) => {
			setLogs(rideRepository.findAll());
			const imported = results.filter(Boolean).length;
			const failed = results.length - imported;
			if (files.length === 1) {
				if (imported === 1) {
					setSnackMsg('FIT file imported successfully.');
				} else {
					setSnackMsg('No data records found in the FIT file.');
				}
			} else {
				const parts: string[] = [];
				if (imported > 0) parts.push(`${imported} File${imported !== 1 ? 's' : ''} imported`);
				if (failed > 0) parts.push(`${failed} failed`);
				setSnackMsg(parts.join(', ') + '.');
			}
		});
	};

	useEffect(() => {
		setLogs(rideRepository.findAll());
	}, []);
	useEffect(() => {
		setSelectionCount(logs.reduce((acc, cur) => acc + +selectionRef.current.has(cur), 0));
	}, [logs]);

	return (
		<StyledContainer maxWidth="lg">
			<MyHead title="Previous Rides" />
			<Box>
				<Title href="/">{isBreakpoint ? 'Previous Rides' : 'Rides'}</Title>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
					<Typography variant="body1" color="text.primary" sx={{ flex: 1 }}>
						Manage and export previous rides.
					</Typography>
					<Button component="label" variant="outlined" size="small">
						Import GPX
						<VisuallyHiddenInput
							type="file"
							accept=".gpx,.GPX"
							aria-label="Upload GPX file"
							multiple
							onChange={handleImportGpx}
						/>
					</Button>
					<Button component="label" variant="outlined" size="small">
						Import FIT
						<VisuallyHiddenInput
							type="file"
							accept=".fit,.FIT"
							aria-label="Upload FIT file"
							multiple
							onChange={handleImportFit}
						/>
					</Button>
				</Box>

				<Grid container spacing={3} alignItems="flex-start">
					<Grid item xs={12} md={8}>
						<Grid container direction="column" alignItems="center" spacing={2}>
							{logs.map((log) => (
								<RideCard
									log={log}
									onSelect={(v: boolean) => {
										if (v) {
											selectionRef.current.set(log, true);
											setSelectionCount(selectionCount + 1);
										} else {
											selectionRef.current.delete(log);
											setSelectionCount(selectionCount - 1);
										}
									}}
									key={log.id}
								/>
							))}
						</Grid>
					</Grid>
					<Grid
						item
						xs={12}
						md={4}
						sx={{
							position: { md: 'sticky' },
							top: { md: 16 },
						}}
					>
						<RideStatsPanel logs={logs} />
					</Grid>
				</Grid>
			</Box>
			<Snackbar open={!!snackMsg} autoHideDuration={4000} onClose={() => setSnackMsg(null)} message={snackMsg} />
			<BottomNavi>
				<BottomNavigationAction
					sx={
						selectionCount === 0
							? { color: 'action.disabled', cursor: 'not-allowed' }
							: {
									'&:hover': {
										color: 'action.disabled',
									},
								}
					}
					label="Delete"
					icon={
						<Badge badgeContent={selectionCount} color="error">
							<IconDelete />
						</Badge>
					}
					onClick={(e) => {
						e.preventDefault();
						{
							if (selectionCount > 0) massDeletion();
						}
					}}
				/>
			</BottomNavi>
		</StyledContainer>
	);
}
