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
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconBike from '@mui/icons-material/DirectionsBike';
import IconClear from '@mui/icons-material/Clear';
import IconDelete from '@mui/icons-material/Delete';
import IconDownload from '@mui/icons-material/GetApp';
import IconExpandMore from '@mui/icons-material/ExpandMore';
import IconMoreVert from '@mui/icons-material/MoreVert';
import IconSearch from '@mui/icons-material/Search';
import IconTune from '@mui/icons-material/Tune';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, styled } from '@mui/material/styles';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef, useMemo, memo, ChangeEvent, ChangeEventHandler, ReactNode } from 'react';
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
import { smartDistanceUnitFormat, distanceUnitConv } from 'lib/units';
import { useGlobalState, addNotification } from 'lib/global';
import type RideMiniMapType from 'components/map/RideMiniMap';

type RideMiniMapArgs = Parameters<typeof RideMiniMapType>[0];
const DynamicRideMiniMap = dynamic<RideMiniMapArgs>(() => import('components/map/RideMiniMap'), {
	ssr: false,
});
const DataGraph = dynamic(() => import('components/DataGraph'), { ssr: false });
const RideExpandedStats = dynamic(() => import('components/RideExpandedStats'), { ssr: false });

// BottomNavigation passes `showLabel` to all its direct children via cloneElement.
// FormControlLabel doesn't consume that prop and would forward it to the <label> DOM
// element, causing a React warning. This wrapper absorbs the prop.
function BottomNavFormItem({
	showLabel: _showLabel,
	children,
}: {
	showLabel?: boolean;
	children: ReactNode;
}) {
	return <>{children}</>;
}

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

const ALL_ACTIVITY_TYPES: ActivityType[] = [
	'trainerFreeRide',
	'trainerWorkout',
	'trainerMap',
	'trainerVirtual',
	'road',
];

const MS_PER_DAY = 86400000;

type SearchFilters = {
	text: string;
	dateFrom: string;
	dateTo: string;
	activityTypes: Set<ActivityType>;
	minDurationMins: string;
	minDistance: string;
};

const EMPTY_FILTERS: SearchFilters = {
	text: '',
	dateFrom: '',
	dateTo: '',
	activityTypes: new Set(),
	minDurationMins: '',
	minDistance: '',
};

function countActiveFilters(f: SearchFilters): number {
	let count = 0;
	if (f.text) count++;
	if (f.dateFrom) count++;
	if (f.dateTo) count++;
	if (f.activityTypes.size > 0) count++;
	if (f.minDurationMins) count++;
	if (f.minDistance) count++;
	return count;
}

function applyFilters(logs: RideEntry[], f: SearchFilters, distanceUnit: string): RideEntry[] {
	return logs.filter((log) => {
		if (f.text) {
			const q = f.text.toLowerCase();
			if (
				!log.logger.getName().toLowerCase().includes(q) &&
				!log.logger.getNotes().toLowerCase().includes(q)
			) {
				return false;
			}
		}
		if (f.dateFrom) {
			const from = new Date(f.dateFrom).getTime();
			if (isNaN(from) || log.ts < from) return false;
		}
		if (f.dateTo) {
			// Include the full end day
			const to = new Date(f.dateTo).getTime() + MS_PER_DAY - 1;
			if (isNaN(to) || log.ts > to) return false;
		}
		if (f.activityTypes.size > 0) {
			if (!f.activityTypes.has(log.logger.getActivityType())) return false;
		}
		if (f.minDurationMins) {
			const minMs = parseFloat(f.minDurationMins) * 60000;
			if (!isNaN(minMs) && log.logger.getTotalTime() < minMs) return false;
		}
		if (f.minDistance) {
			const val = parseFloat(f.minDistance);
			if (!isNaN(val)) {
				const conv = distanceUnit === 'mi' ? distanceUnitConv.mi : distanceUnitConv.km;
				const minM = conv.convToBase(val);
				if (log.logger.getTotalDistance() < minM) return false;
			}
		}
		return true;
	});
}

interface SearchFilterPanelProps {
	filters: SearchFilters;
	onChange: (f: SearchFilters) => void;
	distanceUnit: string;
	totalCount: number;
	filteredCount: number;
}

function SearchFilterPanel({ filters, onChange, distanceUnit, totalCount, filteredCount }: SearchFilterPanelProps) {
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const activeCount = countActiveFilters(filters);
	const distLabel = distanceUnit === 'mi' ? 'mi' : 'km';

	const setField = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
		onChange({ ...filters, [key]: value });

	const toggleActivityType = (type: ActivityType) => {
		const next = new Set(filters.activityTypes);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		onChange({ ...filters, activityTypes: next });
	};

	const hasAdvancedFilters =
		!!filters.dateFrom ||
		!!filters.dateTo ||
		filters.activityTypes.size > 0 ||
		!!filters.minDurationMins ||
		!!filters.minDistance;

	const isFiltered = activeCount > 0;

	return (
		<Box sx={{ mb: 2 }}>
			<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
				<TextField
					size="small"
					placeholder="Search by name or notes…"
					value={filters.text}
					onChange={(e) => setField('text', e.target.value)}
					inputProps={{ 'aria-label': 'Search rides by name or notes' }}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<IconSearch fontSize="small" />
							</InputAdornment>
						),
						endAdornment: filters.text ? (
							<InputAdornment position="end">
								<IconButton
									size="small"
									aria-label="Clear search text"
									onClick={() => setField('text', '')}
									edge="end"
								>
									<IconClear fontSize="small" />
								</IconButton>
							</InputAdornment>
						) : null,
					}}
					sx={{ flex: '1 1 auto', minWidth: 0 }}
				/>
				<Tooltip title={advancedOpen ? 'Hide filters' : 'Show filters'}>
					<Button
						variant={hasAdvancedFilters ? 'contained' : 'outlined'}
						size="small"
						startIcon={<IconTune />}
						onClick={() => setAdvancedOpen((v) => !v)}
						aria-expanded={advancedOpen}
						aria-label={advancedOpen ? 'Hide advanced filters' : 'Show advanced filters'}
						sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
					>
						Filters
						{activeCount > 0 && (
							<Badge
								badgeContent={activeCount}
								color="primary"
								sx={{ ml: 1.5, '& .MuiBadge-badge': { position: 'relative', transform: 'none' } }}
							/>
						)}
					</Button>
				</Tooltip>
				{isFiltered && (
					<Tooltip title="Clear all filters">
						<IconButton
							size="small"
							aria-label="Clear all filters"
							onClick={() => onChange(EMPTY_FILTERS)}
						>
							<IconClear fontSize="small" />
						</IconButton>
					</Tooltip>
				)}
			</Box>

			<Collapse in={advancedOpen} timeout="auto">
				<Box
					sx={{
						mt: 1.5,
						p: 2,
						border: '1px solid',
						borderColor: 'divider',
						borderRadius: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: 2,
					}}
				>
					{/* Date range */}
					<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
						<Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: -1 }}>
							Date range
						</Typography>
						<TextField
							label="From"
							type="date"
							size="small"
							value={filters.dateFrom}
							onChange={(e) => setField('dateFrom', e.target.value)}
							InputLabelProps={{ shrink: true }}
							inputProps={{ 'aria-label': 'Filter rides from date', max: filters.dateTo || undefined }}
							sx={{ width: 160 }}
						/>
						<TextField
							label="To"
							type="date"
							size="small"
							value={filters.dateTo}
							onChange={(e) => setField('dateTo', e.target.value)}
							InputLabelProps={{ shrink: true }}
							inputProps={{ 'aria-label': 'Filter rides to date', min: filters.dateFrom || undefined }}
							sx={{ width: 160 }}
						/>
					</Box>

					{/* Activity type */}
					<Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
						<Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: -0.5 }}>
							Activity type
						</Typography>
						{ALL_ACTIVITY_TYPES.map((type) => (
							<Chip
								key={type}
								label={getActivityTypeLabel(type)}
								size="small"
								clickable
								onClick={() => toggleActivityType(type)}
								color={filters.activityTypes.has(type) ? 'primary' : 'default'}
								variant={filters.activityTypes.has(type) ? 'filled' : 'outlined'}
								aria-pressed={filters.activityTypes.has(type)}
							/>
						))}
					</Box>

					{/* Min duration & min distance */}
					<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
						<Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: -1 }}>
							Minimums
						</Typography>
						<TextField
							label="Min duration"
							type="number"
							size="small"
							value={filters.minDurationMins}
							onChange={(e) => setField('minDurationMins', e.target.value)}
							inputProps={{ min: 0, step: 5, 'aria-label': 'Minimum ride duration in minutes' }}
							InputProps={{
								endAdornment: <InputAdornment position="end">min</InputAdornment>,
							}}
							sx={{ width: 160 }}
						/>
						<TextField
							label="Min distance"
							type="number"
							size="small"
							value={filters.minDistance}
							onChange={(e) => setField('minDistance', e.target.value)}
							inputProps={{ min: 0, step: 1, 'aria-label': `Minimum ride distance in ${distLabel}` }}
							InputProps={{
								endAdornment: <InputAdornment position="end">{distLabel}</InputAdornment>,
							}}
							sx={{ width: 160 }}
						/>
					</Box>
				</Box>
			</Collapse>

			{/* Result count summary (only show when filters are active) */}
			{isFiltered && (
				<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
					{filteredCount === totalCount
						? `${totalCount} ride${totalCount !== 1 ? 's' : ''}`
						: `${filteredCount} of ${totalCount} ride${totalCount !== 1 ? 's' : ''} match`}
				</Typography>
			)}
		</Box>
	);
}

function isTrainerActivity(type: ActivityType): boolean {
	return (
		type === 'trainerFreeRide' || type === 'trainerWorkout' || type === 'trainerMap' || type === 'trainerVirtual'
	);
}

function ImportButton({ onChange }: { onChange: ChangeEventHandler<HTMLInputElement> }) {
	return (
		<Button component="label" variant="outlined" size="small">
			Import
			<VisuallyHiddenInput
				type="file"
				accept=".gpx,.GPX,.gpx.gz,.GPX.gz,.fit,.FIT,.fit.gz,.FIT.gz,.tcx,.TCX,.tcx.gz,.TCX.gz,application/gzip,application/x-gzip"
				aria-label="Upload GPX file"
				multiple
				onChange={onChange}
			/>
		</Button>
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

const PAGE_SIZE = 20;
/** How many px before the sentinel reaches the viewport to trigger a next page load. */
const SCROLL_TRIGGER_MARGIN = '200px';
/** Minimum dialog width in px so the progress bar has enough room to be readable. */
const IMPORT_DIALOG_MIN_WIDTH = 320;

type ImportProgress = { current: number; total: number };

async function importOneFile(file: File): Promise<{ file: File; result: 'ok' | 'duplicate' | 'failed' }> {
	if (/\.gpx(\.gz)?$/i.test(file.name)) {
		return parseXmlFile(file)
			.then((xmlDoc) => {
				const gpxData = gpxDocument2obj(xmlDoc);
				const logger = gpxToActivityLog(gpxData);
				if (!logger) return { file, result: 'failed' as const };
				rideRepository.saveNew(logger);
				return { file, result: 'ok' as const };
			})
			.catch((err) => {
				if (err instanceof RideAlreadyExistsError) return { file, result: 'duplicate' as const };
				return { file, result: 'failed' as const };
			});
	} else if (/\.fit(\.gz)?$/i.test(file.name)) {
		return parseFitFile(file)
			.then((fitData) => {
				const logger = fitToActivityLog(fitData, file.name.replace(/\.fit(\.gz)?$/i, ''));
				if (!logger) return { file, result: 'failed' as const };
				rideRepository.saveNew(logger);
				return { file, result: 'ok' as const };
			})
			.catch((err) => {
				if (err instanceof RideAlreadyExistsError) return { file, result: 'duplicate' as const };
				return { file, result: 'failed' as const };
			});
	} else if (/\.tcx(\.gz)?$/i.test(file.name)) {
		return parseXmlFile(file)
			.then((xmlDoc) => {
				const logger = tcxToActivityLog(xmlDoc, file.name.replace(/\.tcx(\.gz)?$/i, ''));
				if (!logger) return { file, result: 'failed' as const };
				rideRepository.saveNew(logger);
				return { file, result: 'ok' as const };
			})
			.catch((err) => {
				if (err instanceof RideAlreadyExistsError) return { file, result: 'duplicate' as const };
				return { file, result: 'failed' as const };
			});
	}
	return { file, result: 'failed' };
}

function ImportProgressDialog({ progress }: { progress: ImportProgress | null }) {
	if (!progress) return null;
	const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
	return (
		<Dialog open disableEscapeKeyDown aria-labelledby="import-progress-title">
			<DialogTitle id="import-progress-title">Importing rides…</DialogTitle>
			<DialogContent sx={{ minWidth: IMPORT_DIALOG_MIN_WIDTH, pb: 3 }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					{progress.current} / {progress.total} files processed
				</Typography>
				<LinearProgress variant="determinate" value={pct} />
			</DialogContent>
		</Dialog>
	);
}

export default function History() {
	const theme = useTheme();
	const isBreakpoint = useMediaQuery(theme.breakpoints.up('md'));
	const distanceUnit = useGlobalState('unitDistance')[0];
	const [logs, setLogs] = useState<RideEntry[]>([]);
	useEffect(() => {
		rideRepository.ready.then(() => setLogs(rideRepository.findAll()));
	}, []);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const selectionCount = selectedIds.size;
	const [snackMsg, setSnackMsg] = useState<string | null>(null);
	const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('info');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

	// Search / filter state
	const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
	const filteredLogs = useMemo(
		() => applyFilters(logs, filters, distanceUnit),
		[logs, filters, distanceUnit],
	);

	// Infinite scroll: number of ride cards currently rendered
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const [prevFilteredLength, setPrevFilteredLength] = useState(filteredLogs.length);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	// Reset visible count during render when the filtered list grows/shrinks (derived state pattern)
	if (filteredLogs.length !== prevFilteredLength) {
		setPrevFilteredLength(filteredLogs.length);
		setVisibleCount(PAGE_SIZE);
	}

	// IntersectionObserver: load more cards when the sentinel div scrolls into view
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.length > 0 && entries[0].isIntersecting) {
					setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredLogs.length));
				}
			},
			{ rootMargin: SCROLL_TRIGGER_MARGIN },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [filteredLogs.length]);

	const visibleLogs = filteredLogs.slice(0, visibleCount);

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
			if (prev.size === filteredLogs.length) {
				return new Set();
			}
			return new Set(filteredLogs.map((l) => l.id));
		});
	}, [filteredLogs]);

	const massDeletion = useCallback(() => {
		selectedIds.forEach((id) => {
			rideRepository.delete(id);
		});
		setSelectedIds(new Set());
		setLogs(rideRepository.findAll());
	}, [selectedIds]);

	const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		// Reset so selecting the same file(s) again still triggers onChange
		e.target.value = '';
		if (files.length === 0) return;

		const total = files.length;
		// Show progress dialog only when importing more than one file
		if (total > 1) {
			setImportProgress({ current: 0, total });
		}

		// Process files sequentially so we can track progress accurately
		(async () => {
			const results: { file: File; result: 'ok' | 'duplicate' | 'failed' }[] = [];
			for (let i = 0; i < files.length; i++) {
				const res = await importOneFile(files[i]);
				results.push(res);
				if (total > 1) {
					setImportProgress({ current: i + 1, total });
				}
			}

			setImportProgress(null);
			setLogs(rideRepository.findAll());

			const imported = results.filter((r) => r.result === 'ok').length;
			const duplicates = results.filter((r) => r.result === 'duplicate').length;
			const failed = results.filter((r) => r.result === 'failed').length;

			for (const { file: f, result } of results) {
				if (result === 'failed') {
					addNotification({ severity: 'error', text: `Failed to import "${f.name}": no trackpoints found.` });
				} else if (result === 'duplicate') {
					addNotification({ severity: 'warning', text: `"${f.name}" has already been imported.` });
				}
			}

			if (files.length === 1) {
				if (imported === 1) {
					setSnackSeverity('success');
					setSnackMsg('Ride imported successfully.');
				} else if (duplicates === 1) {
					setSnackSeverity('error');
					setSnackMsg('This ride has already been imported.');
				} else {
					setSnackSeverity('error');
					setSnackMsg('No trackpoints found in the file.');
				}
			} else {
				const parts: string[] = [];
				if (imported > 0) parts.push(`${imported} file${imported !== 1 ? 's' : ''} imported`);
				if (duplicates > 0) parts.push(`${duplicates} already exist`);
				if (failed > 0) parts.push(`${failed} failed`);
				setSnackSeverity(duplicates > 0 || failed > 0 ? 'error' : 'success');
				setSnackMsg(parts.join(', ') + '.');
			}
		})();
	};

	const isFiltering = countActiveFilters(filters) > 0;

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
						<ImportButton onChange={handleImport} />
					</Box>
				</Box>

				{logs.length > 0 && (
					<SearchFilterPanel
						filters={filters}
						onChange={setFilters}
						distanceUnit={distanceUnit}
						totalCount={logs.length}
						filteredCount={filteredLogs.length}
					/>
				)}

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
											<ImportButton onChange={handleImport} />
										</Box>
									</Box>
								</Grid>
							)}
							{logs.length > 0 && filteredLogs.length === 0 && (
								<Grid item sx={{ width: '100%' }}>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											py: 6,
											px: 2,
										}}
									>
										<IconSearch
											sx={{
												fontSize: 48,
												color: 'action.disabled',
												mb: 2,
											}}
										/>
										<Typography variant="h6" color="text.secondary" gutterBottom>
											No matching rides
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary"
											sx={{ maxWidth: 320, textAlign: 'center', mb: 3 }}
										>
											Try adjusting your search or filters to find what you&apos;re looking for.
										</Typography>
										<Button variant="outlined" size="small" onClick={() => setFilters(EMPTY_FILTERS)}>
											Clear filters
										</Button>
									</Box>
								</Grid>
							)}
							{visibleLogs.map((log) => (
								<RideCard
									log={log}
									onSelect={handleSelect}
									checked={selectedIds.has(log.id)}
									key={log.id}
								/>
							))}
							{/* Sentinel element that triggers loading the next page */}
							<div ref={sentinelRef} style={{ width: '100%', height: 1 }} aria-hidden="true" />
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
			<ImportProgressDialog progress={importProgress} />
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
				<BottomNavFormItem>
					<FormControlLabel
						control={
							<Checkbox
								checked={filteredLogs.length > 0 && selectedIds.size === filteredLogs.length}
								indeterminate={selectedIds.size > 0 && selectedIds.size < filteredLogs.length}
								onChange={handleSelectAll}
								disabled={filteredLogs.length === 0}
								inputProps={{
									'aria-label':
										filteredLogs.length > 0 && selectedIds.size === filteredLogs.length
											? 'Deselect all rides'
											: isFiltering
												? 'Select all matching rides'
												: 'Select all rides',
								}}
							/>
						}
						label={
							filteredLogs.length > 0 && selectedIds.size === filteredLogs.length
								? 'Deselect all'
								: isFiltering
									? 'Select matches'
									: 'Select all'
						}
						sx={{ mx: 1 }}
					/>
				</BottomNavFormItem>
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
