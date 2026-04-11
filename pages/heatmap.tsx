// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import { getActivityLogs } from 'lib/activity_log';
import { useMemo } from 'react';
import type RideHeatmapLayerType from 'components/map/RideHeatmapLayer';
import { OpenStreetMapArg } from 'components/map/OpenStreetMap';

type RideHeatmapLayerArgs = Parameters<typeof RideHeatmapLayerType>[0];

const DynamicMap = dynamic<OpenStreetMapArg>(() => import('components/map/OpenStreetMap'), {
	ssr: false,
});

const DynamicHeatmapLayer = dynamic<RideHeatmapLayerArgs>(
	() => import('components/map/RideHeatmapLayer'),
	{ ssr: false }
);

export default function Heatmap() {
	const tracks = useMemo<[number, number][][]>(() => {
		return getActivityLogs()
			.map((log) =>
				log.logger
					.getLaps()
					.flatMap((lap) => lap.trackPoints)
					.filter(
						(tp) =>
							tp.position &&
							typeof tp.position.lat === 'number' &&
							typeof tp.position.lon === 'number'
					)
					.map((tp) => [tp.position.lat, tp.position.lon] as [number, number])
			)
			.filter((positions) => positions.length > 0);
	}, []);

	const mapHeight = 'clamp(300px, 65vh, 700px)';
	const hasData = tracks.length > 0;

	// Use the first point of the first track as initial map center, fallback to London
	const center: [number, number] =
		hasData && tracks[0].length > 0 ? tracks[0][0] : [51.505, -0.09];

	return (
		<Container maxWidth="md">
			<MyHead title="Heatmap" />
			<Title href="/">Heatmap</Title>
			<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
				{hasData
					? `Showing ${tracks.length} ride${tracks.length !== 1 ? 's' : ''} with GPS data.`
					: 'No rides with GPS data found. Record a ride with GPS enabled to see it here.'}
			</Typography>
			<Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
				<DynamicMap center={center} width="100%" height={mapHeight} setMap={null} ariaLabel="Interactive map showing heatmap of all recorded rides with GPS data">
					{hasData && <DynamicHeatmapLayer tracks={tracks} />}
				</DynamicMap>
			</Box>
		</Container>
	);
}
