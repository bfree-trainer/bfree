// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Alert from '@mui/material/Alert';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import IconBike from '@mui/icons-material/DirectionsBike';
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
import Link from 'next/link';
import { useState, useCallback, memo, ChangeEvent } from 'react';
import BottomNavi from 'components/BottomNavi';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import EditRideModal from 'components/EditRideModal';
import RideStatsPanel from 'components/RideStatsPanel';
import WarningDialog from 'components/WarningDialog';
import downloadBlob from 'lib/download_blob';
import { gpxToActivityLog, fitToActivityLog, tcxToActivityLog } from 'lib/activity_log';
import type { ActivityType } from 'lib/activity_log';
import type { RideEntry } from 'lib/orm';
import { rideRepository, RideAlreadyExistsError } from 'lib/orm';
import { parseXmlFile } from 'lib/xml_parser';
import { gpxDocument2obj } from 'lib/gpx_parser';
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
const RideExpandedStats = dynamic(() => import('components/RideExpandedStats'), { ssr: false });

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

const RideStatsUl = styled('ul')({
	margin: 0,
	padding: 0,
	alignItems: 'stretch',
	display: 'flex',
	flexFlow: 'row wrap',
	listStyle: 'none',
});

const RideStatsLi = styled('li')(({ theme }) => ({
	listStyle: 'none',
	margin: 0,
	padding: theme.spacing(0.75),
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'flex-end',
	borderRight: `1px solid ${theme.palette.divider}`,
	'&:last-child': {
		borderRight: 'none',
	},
}));

type Log = RideEntry;

function RideStats({ stats }: { stats: [string, string][] }) {
	return (
		<RideStatsUl>
			{stats.map((stat, i) => (
				<RideStatsLi key={i}>
					<Typography variant="caption" color="text.secondary">{stat[0]}</Typography>
					<Typography variant="body1" fontWeight={600}>{stat[1]}</Typography>
				</RideStatsLi>
			))}
		</RideStatsUl>
	);
}

interface ExpandMoreProps extends IconButtonProps {
	expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
	return (
		type === 'trainerFreeRide' || type === 'trainerWorkout' || type === 'trainerMap' || type === 'trainerVirtual'
	);
}

const RideCard = memo(function RideCard({
	log,
	onSelect,
	checked,
}: {
	log: Log;
	onSelect: (log: Log, v: boolean) => void;
	checked: boolean;
}) {
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
		<Grid item sx={{ width: '100%', maxWidth: { xs: '100%', sm: 400 } }}>
			<Card variant="outlined" sx={{ width: '100%' }}>
				<CardHeader
					avatar={
						<Avatar aria-label="ride" sx={{ bgcolor: 'error.main' }}>
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
								{isTrainerActivity(activityType) && (
									<Chip label="Trainer" size="small" variant="outlined" />
								)}
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
					{notes && (
						<Typography variant="body2" color="text.secondary" component="p">
							{notes}
						</Typography>
					)}
				</CardContent>
				<Collapse in={expanded} timeout="auto" unmountOnExit id={`ride-details-${log.id}`}>
					<CardContent>
						<DataGraph logger={log.logger} type="full" isInteractive={true} />
						<RideExpandedStats logger={log.logger} />
					</CardContent>
				</Collapse>
				<CardActions disableSpacing>
					<IconButton aria-label="Download ride as TCX" onClick={handleDownload} size="large">
						<IconDownload />
					</IconButton>
					<Checkbox
						color="default"
						aria-label={`Select ${name}`}
						checked={checked}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelect(log, e.target.checked)}
					/>
					<ExpandMore
						expand={expanded}
						onClick={handleExpandClick}
						aria-expanded={expanded}
						aria-controls={`ride-details-${log.id}`}
						aria-label={expanded ? 'Hide ride details' : 'Show ride details'}
					>
						<IconExpandMore />
					</ExpandMore>
				</CardActions>
			</Card>
			<EditRideModal open={showEditModal} onClose={() => setShowEditModal(false)} logger={log.logger} />
		</Grid>
	);
});

export default function History() {
	const theme = useTheme();
	const isBreakpoint = useMediaQuery(theme.breakpoints.up('md'));
	const [logs, setLogs] = useState<RideEntry[]>(() => rideRepository.findAll());
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const selectionCount = selectedIds.size;
	const [snackMsg, setSnackMsg] = useState<string | null>(null);
	const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('info');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const handleSelect = useCallback((log: Log, selected: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (selected) {
				next.add(log.id);
			} else {
				next.delete(log.id);
			}
			return next;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		setSelectedIds((prev) => {
			if (prev.size === logs.length) {
				return new Set();
			}
			return new Set(logs.map((l) => l.id));
		});
	}, [logs]);

	const massDeletion = useCallback(() => {
		selectedIds.forEach((id) => {
			rideRepository.delete(id);
		});
		setSelectedIds(new Set());
		setLogs(rideRepository.findAll());
	}, [selectedIds]);

	const handleImportGpx = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		// Reset so selecting the same file(s) again still triggers onChange
		e.target.value = '';
		if (files.length === 0) return;

		const promises = files.map((file) =>
			parseXmlFile(file)
				.then((xmlDoc) => {
					const gpxData = gpxDocument2obj(xmlDoc);
					const logger = gpxToActivityLog(gpxData);
					if (!logger) return 'failed' as const;
					rideRepository.saveNew(logger);
					return 'ok' as const;
				})
				.catch((err) => {
					if (err instanceof RideAlreadyExistsError) return 'duplicate' as const;
					return 'failed' as const;
				})
		);

		Promise.all(promises).then((results) => {
			setLogs(rideRepository.findAll());
			const imported = results.filter((r) => r === 'ok').length;
			const duplicates = results.filter((r) => r === 'duplicate').length;
			const failed = results.filter((r) => r === 'failed').length;
			if (files.length === 1) {
				if (imported === 1) {
					setSnackSeverity('success');
					setSnackMsg('GPX file imported successfully.');
				} else if (duplicates === 1) {
					setSnackSeverity('error');
					setSnackMsg('This ride has already been imported.');
				} else {
					setSnackSeverity('error');
					setSnackMsg('No trackpoints found in the GPX file.');
				}
			} else {
				const parts: string[] = [];
				if (imported > 0) parts.push(`${imported} file${imported !== 1 ? 's' : ''} imported`);
				if (duplicates > 0) parts.push(`${duplicates} already exist`);
				if (failed > 0) parts.push(`${failed} failed`);
				setSnackSeverity(duplicates > 0 || failed > 0 ? 'error' : 'success');
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
					const logger = fitToActivityLog(fitData, file.name.replace(/\.fit(\.gz)?$/i, ''));
					if (!logger) return 'failed' as const;
					rideRepository.saveNew(logger);
					return 'ok' as const;
				})
				.catch((err) => {
					if (err instanceof RideAlreadyExistsError) return 'duplicate' as const;
					return 'failed' as const;
				})
		);

		Promise.all(promises).then((results) => {
			setLogs(rideRepository.findAll());
			const imported = results.filter((r) => r === 'ok').length;
			const duplicates = results.filter((r) => r === 'duplicate').length;
			const failed = results.filter((r) => r === 'failed').length;
			if (files.length === 1) {
				if (imported === 1) {
					setSnackSeverity('success');
					setSnackMsg('FIT file imported successfully.');
				} else if (duplicates === 1) {
					setSnackSeverity('error');
					setSnackMsg('This ride has already been imported.');
				} else {
					setSnackSeverity('error');
					setSnackMsg('No data records found in the FIT file.');
				}
			} else {
				const parts: string[] = [];
				if (imported > 0) parts.push(`${imported} file${imported !== 1 ? 's' : ''} imported`);
				if (duplicates > 0) parts.push(`${duplicates} already exist`);
				if (failed > 0) parts.push(`${failed} failed`);
				setSnackSeverity(duplicates > 0 || failed > 0 ? 'error' : 'success');
				setSnackMsg(parts.join(', ') + '.');
			}
		});
	};

	const handleImportTcx = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		// Reset so selecting the same file(s) again still triggers onChange
		e.target.value = '';
		if (files.length === 0) return;

		const promises = files.map((file) =>
			parseXmlFile(file)
				.then((xmlDoc) => {
					const logger = tcxToActivityLog(xmlDoc, file.name.replace(/\.tcx(\.gz)?$/i, ''));
					if (!logger) return 'failed' as const;
					rideRepository.saveNew(logger);
					return 'ok' as const;
				})
				.catch((err) => {
					if (err instanceof RideAlreadyExistsError) return 'duplicate' as const;
					return 'failed' as const;
				})
		);

		Promise.all(promises).then((results) => {
			setLogs(rideRepository.findAll());
			const imported = results.filter((r) => r === 'ok').length;
			const duplicates = results.filter((r) => r === 'duplicate').length;
			const failed = results.filter((r) => r === 'failed').length;
			if (files.length === 1) {
				if (imported === 1) {
					setSnackSeverity('success');
					setSnackMsg('TCX file imported successfully.');
				} else if (duplicates === 1) {
					setSnackSeverity('error');
					setSnackMsg('This ride has already been imported.');
				} else {
					setSnackSeverity('error');
					setSnackMsg('No trackpoints found in the TCX file.');
				}
			} else {
				const parts: string[] = [];
				if (imported > 0) parts.push(`${imported} file${imported !== 1 ? 's' : ''} imported`);
				if (duplicates > 0) parts.push(`${duplicates} already exist`);
				if (failed > 0) parts.push(`${failed} failed`);
				setSnackSeverity(duplicates > 0 || failed > 0 ? 'error' : 'success');
				setSnackMsg(parts.join(', ') + '.');
			}
		});
	};

	return (
		<Container maxWidth="lg" sx={{ pb: 9 }}>
			<MyHead title="Previous Rides" />
			<Box>
				<Title href="/">{isBreakpoint ? 'Previous Rides' : 'Rides'}</Title>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2, flexWrap: 'wrap' }}>
					<Typography variant="body1" color="text.primary" sx={{ flex: '1 1 auto', minWidth: 0 }}>
						Manage and export previous rides.
					</Typography>
					<Box sx={{ display: 'flex', gap: 1 }}>
						<Button component="label" variant="outlined" size="small">
							Import GPX
							<VisuallyHiddenInput
								type="file"
								accept=".gpx,.GPX,.gpx.gz,.GPX.gz,application/gzip,application/x-gzip"
								aria-label="Upload GPX file"
								multiple
								onChange={handleImportGpx}
							/>
						</Button>
						<Button component="label" variant="outlined" size="small">
							Import FIT
							<VisuallyHiddenInput
								type="file"
								accept=".fit,.FIT,.fit.gz,.FIT.gz,application/gzip,application/x-gzip"
								aria-label="Upload FIT file"
								multiple
								onChange={handleImportFit}
							/>
						</Button>
						<Button component="label" variant="outlined" size="small">
							Import TCX
							<VisuallyHiddenInput
								type="file"
								accept=".tcx,.TCX,.tcx.gz,.TCX.gz,application/gzip,application/x-gzip"
								aria-label="Upload TCX file"
								multiple
								onChange={handleImportTcx}
							/>
						</Button>
					</Box>
				</Box>

				<Grid container spacing={3} alignItems="flex-start">
					<Grid item xs={12} md={8}>
						<Grid container direction="column" alignItems="center" spacing={2}>
							{logs.length === 0 && (
								<Grid item sx={{ width: '100%' }}>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											py: 8,
											px: 2,
										}}
									>
										<IconBike
											sx={{
												fontSize: 56,
												color: 'action.disabled',
												mb: 2,
											}}
										/>
										<Typography variant="h6" color="text.secondary" gutterBottom>
											No rides yet
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary"
											sx={{ maxWidth: 360, textAlign: 'center', mb: 3 }}
										>
											Your ride history will appear here — distance, time, route maps, and
											performance charts for every session.
										</Typography>
										<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
											<Button
												component={Link}
												href="/ride"
												variant="contained"
												size="medium"
											>
												Start a ride
											</Button>
											<Button component="label" variant="outlined" size="medium">
												Import GPX
												<VisuallyHiddenInput
													type="file"
													accept=".gpx,.GPX,.gpx.gz,.GPX.gz,application/gzip,application/x-gzip"
													aria-label="Upload GPX file"
													multiple
													onChange={handleImportGpx}
												/>
											</Button>
											<Button component="label" variant="outlined" size="medium">
												Import FIT
												<VisuallyHiddenInput
													type="file"
													accept=".fit,.FIT,.fit.gz,.FIT.gz,application/gzip,application/x-gzip"
													aria-label="Upload FIT file"
													multiple
													onChange={handleImportFit}
												/>
											</Button>
											<Button component="label" variant="outlined" size="medium">
												Import TCX
												<VisuallyHiddenInput
													type="file"
													accept=".tcx,.TCX"
													aria-label="Upload TCX file"
													multiple
													onChange={handleImportTcx}
												/>
											</Button>
										</Box>
									</Box>
								</Grid>
							)}
							{logs.map((log) => (
								<RideCard
									log={log}
									onSelect={handleSelect}
									checked={selectedIds.has(log.id)}
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
							order: { xs: -1, md: 0 },
						}}
					>
						<RideStatsPanel logs={logs} />
					</Grid>
				</Grid>
			</Box>
			<Snackbar
				open={!!snackMsg}
				autoHideDuration={4000}
				onClose={() => setSnackMsg(null)}
				sx={{ mb: 7 }}
			>
				<Alert
					onClose={() => setSnackMsg(null)}
					severity={snackSeverity}
					variant="filled"
					sx={{ width: '100%' }}
				>
					{snackMsg}
				</Alert>
			</Snackbar>
			<WarningDialog
				title="Delete rides"
				show={showDeleteConfirm}
				handleCancel={() => setShowDeleteConfirm(false)}
				handleContinue={() => {
					setShowDeleteConfirm(false);
					massDeletion();
				}}
			>
				{`Delete ${selectionCount} selected ride${selectionCount !== 1 ? 's' : ''}? This cannot be undone.`}
			</WarningDialog>
			<BottomNavi>
				<FormControlLabel
					control={
						<Checkbox
							checked={logs.length > 0 && selectedIds.size === logs.length}
							indeterminate={selectedIds.size > 0 && selectedIds.size < logs.length}
							onChange={handleSelectAll}
							disabled={logs.length === 0}
							inputProps={{
								'aria-label':
									logs.length > 0 && selectedIds.size === logs.length
										? 'Deselect all rides'
										: 'Select all rides',
							}}
						/>
					}
					label={
						logs.length > 0 && selectedIds.size === logs.length ? 'Deselect all' : 'Select all'
					}
					sx={{ mx: 1 }}
				/>
				<BottomNavigationAction
					disabled={selectionCount === 0}
					sx={
						selectionCount === 0
							? { color: 'action.disabled' }
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
						setShowDeleteConfirm(true);
					}}
				/>
			</BottomNavi>
		</Container>
	);
}
