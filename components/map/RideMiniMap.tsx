// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
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

/** Fits the map view to the route and re-fits after expand/collapse transitions. */
function MapController({
	positions,
	expanded,
	containerRef,
}: {
	positions: [number, number][];
	expanded: boolean;
	containerRef: RefObject<HTMLDivElement>;
}) {
	const map = useMap();

	const fitView = useCallback(() => {
		if (positions.length === 0) return;
		if (positions.length === 1) {
			map.setView(positions[0], 13);
			return;
		}
		// The Leaflet map div is always EXPANDED_HEIGHT tall, but in compact mode
		// only the top portion (COMPACT_HEIGHT) is visible due to overflow:hidden.
		// Add bottom padding equal to the hidden area so fitBounds fits the route
		// within the actually visible portion of the map.
		const mapHeight = map.getContainer().clientHeight;
		const visibleHeight = containerRef.current?.clientHeight ?? mapHeight;
		const paddingBottom = Math.max(0, mapHeight - visibleHeight);
		map.fitBounds(positions, paddingBottom > 0 ? { paddingBottomRight: [0, paddingBottom] } : undefined);
	}, [map, positions, containerRef]);

	// Initial fit on mount.
	useEffect(() => {
		fitView();
	}, [fitView]);

	// After expand/collapse: wait for the CSS transition to finish, then
	// recalculate the map size and re-fit so the route fills the new viewport.
	useEffect(() => {
		const timer = setTimeout(() => {
			map.invalidateSize();
			fitView();
		}, 320);
		return () => clearTimeout(timer);
	}, [map, expanded, fitView]);

	return null;
}

export default function RideMiniMap({ logger }: { logger: ReturnType<typeof createActivityLog> }) {
	const theme = useTheme();
	const [expanded, setExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

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
				ref={containerRef}
				sx={{
					height: expanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT,
					overflow: 'hidden',
					transition: 'height 0.3s ease',
					'@media (prefers-reduced-motion: reduce)': { transition: 'none' },
				}}
			>
				<OpenStreetMap center={center} width="100%" height={EXPANDED_HEIGHT} setMap={null}>
					<MapController positions={positions} expanded={expanded} containerRef={containerRef} />
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
