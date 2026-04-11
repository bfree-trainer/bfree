// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import { rideRepository } from 'lib/orm';
import { useMemo } from 'react';
import { OpenStreetMapArg } from 'components/map/OpenStreetMap';
import { RideHeatmapLayerArgs } from 'components/map/RideHeatmapLayer';
import { ExplorerTilesLayerArgs } from 'components/map/ExplorerTilesLayer';
import { collectVisitedTiles, findMaxSquare } from 'lib/explorer_tiles';
import { explorerColors } from 'lib/tokens';

const DynamicMap = dynamic<OpenStreetMapArg>(() => import('components/map/OpenStreetMap'), {
ssr: false,
});
const DynamicHeatmapLayer = dynamic<RideHeatmapLayerArgs>(() => import('components/map/RideHeatmapLayer'), {
ssr: false,
});
const DynamicExplorerTilesLayer = dynamic<ExplorerTilesLayerArgs>(
() => import('components/map/ExplorerTilesLayer'),
{ ssr: false },
);

export default function Heatmap() {
const tracks = useMemo<[number, number][][]>(() => {
return rideRepository
			.findAll()
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
}, []);

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
<Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
<DynamicMap
center={center}
width="100%"
height={mapHeight}
setMap={null}
ariaLabel="Interactive map showing heatmap of all recorded rides with GPS data"
>
{hasData && <DynamicHeatmapLayer tracks={tracks} />}
</DynamicMap>
</Box>

{/* Explorer Tiles section — shown only when there are GPS tracks */}
{explorerTiles.size > 0 && (
<Box sx={{ mt: 4 }}>
<Divider sx={{ mb: 3 }} />
<Typography variant="h6" fontWeight={700} gutterBottom>
Explorer Tiles
</Typography>
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
<Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 1 }}>
<DynamicMap
center={center}
width="100%"
height="clamp(300px, 55vh, 600px)"
setMap={null}
ariaLabel="Map showing visited explorer tiles and max square"
>
<DynamicExplorerTilesLayer tracks={tracks} />
</DynamicMap>
</Box>
</Box>
)}
</Container>
);
}
