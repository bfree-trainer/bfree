// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import { rideRepository } from 'lib/orm';
import { useMemo, useState } from 'react';
import { OpenStreetMapArg } from 'components/map/OpenStreetMap';
import { RideHeatmapLayerArgs } from 'components/map/RideHeatmapLayer';
import { ExplorerTilesLayerArgs } from 'components/map/ExplorerTilesLayer';
import { collectVisitedTiles, findMaxSquare } from 'lib/explorer_tiles';
import { explorerColors } from 'lib/tokens';
import type { ActivityType } from 'lib/activity_log';

const DynamicMap = dynamic<OpenStreetMapArg>(() => import('components/map/OpenStreetMap'), {
	ssr: false,
});
const DynamicHeatmapLayer = dynamic<RideHeatmapLayerArgs>(() => import('components/map/RideHeatmapLayer'), {
	ssr: false,
});
const DynamicExplorerTilesLayer = dynamic<ExplorerTilesLayerArgs>(() => import('components/map/ExplorerTilesLayer'), {
	ssr: false,
});

type RideTypeFilter = 'all' | 'road' | 'trainer';
type DateFilterType = 'allTime' | 'currentYear' | 'year' | 'custom';

function isTrainerActivity(type: ActivityType): boolean {
	return type === 'trainerFreeRide' || type === 'trainerWorkout' || type === 'trainerMap' || type === 'trainerVirtual';
}

export default function Heatmap() {
	const [rideTypeFilter, setRideTypeFilter] = useState<RideTypeFilter>('all');
	const [dateFilterType, setDateFilterType] = useState<DateFilterType>('allTime');
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
	const [customStart, setCustomStart] = useState<string>('');
	const [customEnd, setCustomEnd] = useState<string>('');

	const allLogs = useMemo(() => rideRepository.findAll(), []);

	const availableYears = useMemo(() => {
		const years = new Set<number>();
		allLogs.forEach((log) => {
			if (log.ts) years.add(new Date(log.ts).getFullYear());
		});
		return Array.from(years).sort((a, b) => b - a);
	}, [allLogs]);

	const tracks = useMemo<[number, number][][]>(() => {
		let logs = allLogs;

		// Ride type filter
		if (rideTypeFilter === 'road') {
			logs = logs.filter((log) => log.logger.getActivityType() === 'road');
		} else if (rideTypeFilter === 'trainer') {
			logs = logs.filter((log) => isTrainerActivity(log.logger.getActivityType()));
		}

		// Date filter
		const now = new Date();
		if (dateFilterType === 'currentYear') {
			const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
			const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
			logs = logs.filter((log) => log.ts >= startOfYear && log.ts <= endOfYear);
		} else if (dateFilterType === 'year') {
			const startOfYear = new Date(selectedYear, 0, 1).getTime();
			const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999).getTime();
			logs = logs.filter((log) => log.ts >= startOfYear && log.ts <= endOfYear);
		} else if (dateFilterType === 'custom' && customStart) {
			const start = new Date(customStart).getTime();
			const end = customEnd ? new Date(customEnd + 'T23:59:59').getTime() : Infinity;
			logs = logs.filter((log) => log.ts >= start && log.ts <= end);
		}

		return logs
			.map((log) =>
				log.logger
					.getLaps()
					.flatMap((lap) => lap.trackPoints)
					.filter(
						(tp) =>
							tp.position && typeof tp.position.lat === 'number' && typeof tp.position.lon === 'number'
					)
					.map((tp) => [tp.position.lat, tp.position.lon] as [number, number])
			)
			.filter((positions) => positions.length > 0);
	}, [allLogs, rideTypeFilter, dateFilterType, selectedYear, customStart, customEnd]);

	const explorerTiles = useMemo(() => collectVisitedTiles(tracks), [tracks]);
	const maxSquare = useMemo(() => findMaxSquare(explorerTiles), [explorerTiles]);

	const mapHeight = 'clamp(300px, 65vh, 700px)';
	const hasData = tracks.length > 0;

	// Use the first point of the first track as initial map center, fallback to London
	const center: [number, number] = hasData && tracks[0].length > 0 ? tracks[0][0] : [51.505, -0.09];

	return (
		<Container maxWidth="md">
			<MyHead title="Heatmap" />
			<Title href="/">Heatmap</Title>
			<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
				{hasData
					? `Showing ${tracks.length} ride${tracks.length !== 1 ? 's' : ''} with GPS data.`
					: 'No rides with GPS data found. Record a ride with GPS enabled to see it here.'}
			</Typography>

			{/* Filter panel */}
			<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
				<Stack spacing={2}>
					<Box>
						<Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
							Ride type
						</Typography>
						<ToggleButtonGroup
							value={rideTypeFilter}
							exclusive
							onChange={(_e, val) => val && setRideTypeFilter(val)}
							size="small"
						>
							<ToggleButton value="all">All</ToggleButton>
							<ToggleButton value="road">Road</ToggleButton>
							<ToggleButton value="trainer">Trainer (GPS)</ToggleButton>
						</ToggleButtonGroup>
					</Box>

					<Divider />

					<Box>
						<Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
							Date range
						</Typography>
						<Stack spacing={1.5}>
							<ToggleButtonGroup
								value={dateFilterType}
								exclusive
								onChange={(_e, val) => val && setDateFilterType(val)}
								size="small"
								sx={{ flexWrap: 'wrap', gap: 0.5 }}
							>
								<ToggleButton value="allTime">All time</ToggleButton>
								<ToggleButton value="currentYear">This year</ToggleButton>
								<ToggleButton value="year">By year</ToggleButton>
								<ToggleButton value="custom">Custom range</ToggleButton>
							</ToggleButtonGroup>

							{dateFilterType === 'year' && (
								<FormControl size="small" sx={{ minWidth: 120 }}>
									<InputLabel id="year-select-label">Year</InputLabel>
									<Select
										labelId="year-select-label"
										value={selectedYear}
										label="Year"
										onChange={(e) => setSelectedYear(Number(e.target.value))}
									>
										{availableYears.map((yr) => (
											<MenuItem key={yr} value={yr}>
												{yr}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}

							{dateFilterType === 'custom' && (
								<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
									<TextField
										label="From"
										type="date"
										size="small"
										value={customStart}
										onChange={(e) => setCustomStart(e.target.value)}
										InputLabelProps={{ shrink: true }}
									/>
									<Typography variant="body2" color="text.secondary">
										–
									</Typography>
									<TextField
										label="To"
										type="date"
										size="small"
										value={customEnd}
										onChange={(e) => setCustomEnd(e.target.value)}
										InputLabelProps={{ shrink: true }}
									/>
								</Stack>
							)}
						</Stack>
					</Box>
				</Stack>
			</Paper>

			<Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
				<Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
					<Box>
						<Typography variant="h4" fontWeight={700} color="primary">
							{explorerTiles.size}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							tiles visited
						</Typography>
					</Box>
					{maxSquare && (
						<Box>
							<Typography variant="h4" fontWeight={700} sx={{ color: explorerColors.maxSquare }}>
								{maxSquare.size}×{maxSquare.size}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								max square
							</Typography>
						</Box>
					)}
				</Paper>
				<DynamicMap
					center={center}
					width="100%"
					height={mapHeight}
					setMap={null}
					ariaLabel="Interactive map showing heatmap of all recorded rides with GPS data"
				>
					{hasData && <DynamicHeatmapLayer tracks={tracks} />}
					{hasData && <DynamicExplorerTilesLayer tracks={tracks} />}
				</DynamicMap>
			</Box>
		</Container>
	);
}
