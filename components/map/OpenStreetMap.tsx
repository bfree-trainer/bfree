// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { ReactNode, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import Box from '@mui/material/Box';
import 'leaflet/dist/leaflet.css';

// Intercept trackpad pinch gestures (wheel + ctrlKey) so the browser does not
// zoom the page viewport.  On macOS/Edge/Chrome a two-finger pinch is delivered
// as a wheel event with ctrlKey=true; touch-action:none only covers pointer/touch
// events, so we need a separate non-passive wheel handler.
const PINCH_ZOOM_SENSITIVITY = 0.01;

function PinchZoomHandler() {
	const map = useMap();
	useEffect(() => {
		const container = map.getContainer();
		const onWheel = (e: WheelEvent) => {
			if (e.ctrlKey) {
				e.preventDefault();
				e.stopPropagation();
				const newZoom = map.getZoom() + e.deltaY * -PINCH_ZOOM_SENSITIVITY;
				map.setZoom(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), newZoom)));
			}
		};
		container.addEventListener('wheel', onWheel, { passive: false });
		return () => container.removeEventListener('wheel', onWheel);
	}, [map]);
	return null;
}

const OpenStreetMap = ({
	children,
	center,
	width,
	height,
	setMap,
	ariaLabel,
}: {
	children?: ReactNode;
	center: number[];
	width: string;
	height: string;
	setMap: any;
	ariaLabel?: string;
}) => {
	return (
		<Box role="region" aria-label={ariaLabel || 'Map'}>
			<MapContainer
				style={{
					width,
					height,
					touchAction: 'none',
				}}
				// @ts-ignore
				center={center}
				zoom={13}
				scrollWheelZoom={false}
				touchZoom={true}
				ref={setMap}
			>
				<PinchZoomHandler />
				<TileLayer
					// @ts-ignore
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{children}
			</MapContainer>
		</Box>
	);
};

export type OpenStreetMapArg = Parameters<typeof OpenStreetMap>[0];
export default OpenStreetMap;
