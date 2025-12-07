// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import { ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import Box from '@mui/material/Box';
import 'leaflet/dist/leaflet.css';

const OpenStreetMap = ({
	children,
	center,
	width,
	height,
	setMap,
}: {
	children?: ReactNode;
	center: number[];
	width: string;
	height: string;
	setMap: any;
}) => {
	return (
		<Box>
			<MapContainer
				style={{
					width,
					height,
				}}
				// @ts-ignore
				center={center}
				zoom={13}
				scrollWheelZoom={false}
				ref={setMap}
			>
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

export default OpenStreetMap;
