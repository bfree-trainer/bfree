// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { useTheme } from '@mui/material/styles';
import { Polyline, useMap } from 'react-leaflet';
import { createActivityLog } from 'lib/activity_log';
import OpenStreetMap from 'components/map/OpenStreetMap';
import 'leaflet/dist/leaflet.css';

const COMPACT_HEIGHT = 'clamp(150px, 25vw, 200px)';
const EXPANDED_HEIGHT = '400px';

function FitBounds({ positions }: { positions: [number, number][] }) {
	const map = useMap();

	useEffect(() => {
		if (map && positions.length > 1) {
			map.fitBounds(positions);
		} else if (map && positions.length === 1) {
			map.setView(positions[0], 13);
		}
	}, [map, positions]);

	return null;
}

/** Invalidates map size after the parent container resizes. */
function ResizeInvalidator({ expanded }: { expanded: boolean }) {
	const map = useMap();

	useEffect(() => {
		// Wait for the CSS transition to finish, then tell Leaflet to recalculate.
		const timer = setTimeout(() => {
			map.invalidateSize();
		}, 320);
		return () => clearTimeout(timer);
	}, [map, expanded]);

	return null;
}

export default function RideMiniMap({ logger }: { logger: ReturnType<typeof createActivityLog> }) {
	const theme = useTheme();
	const [expanded, setExpanded] = useState(false);

	const positions: [number, number][] = logger
		.getLaps()
		.flatMap((lap) => lap.trackPoints)
		.filter((tp) => tp.position && typeof tp.position.lat === 'number' && typeof tp.position.lon === 'number')
		.map((tp) => [tp.position.lat, tp.position.lon]);

	const handleToggle = useCallback(() => setExpanded((v) => !v), []);

	if (positions.length === 0) {
		return null;
	}

	const center = positions[0];

	return (
		<Box sx={{ position: 'relative' }}>
			<Box
				sx={{
					height: expanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT,
					overflow: 'hidden',
					transition: 'height 0.3s ease',
					'@media (prefers-reduced-motion: reduce)': { transition: 'none' },
				}}
			>
				<OpenStreetMap center={center} width="100%" height={EXPANDED_HEIGHT} setMap={null}>
					<FitBounds positions={positions} />
					<ResizeInvalidator expanded={expanded} />
					<Polyline positions={positions} pathOptions={{ color: theme.palette.primary.main, weight: 3 }} />
				</OpenStreetMap>
			</Box>
			<IconButton
				aria-label={expanded ? 'Collapse map' : 'Expand map'}
				onClick={handleToggle}
				size="small"
				sx={{
					position: 'absolute',
					bottom: 8,
					right: 8,
					bgcolor: 'background.paper',
					boxShadow: 1,
					zIndex: 1000,
					'&:hover': { bgcolor: 'background.paper' },
				}}
			>
				{expanded ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
			</IconButton>
		</Box>
	);
}
