// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

'use client';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import MarkerIcon from '../../node_modules/leaflet/dist/images/marker-icon.png';
import MarkerShadow from '../../node_modules/leaflet/dist/images/marker-shadow.png';

export function createMarkerIcon(icon?: ReactNode) {
	if (icon) {
		return L.divIcon({
			html: renderToString(icon),
			className: null,
		});
	} else {
		return new L.Icon({
			iconUrl: MarkerIcon.src,
			iconRetinaUrl: MarkerIcon.src,
			iconSize: [25, 41],
			iconAnchor: [12.5, 41],
			popupAnchor: [0, -41],
			shadowUrl: MarkerShadow.src,
			shadowSize: [41, 41],
		});
	}
}

export default function MapMarker({
	icon,
	position,
	hidden,
	children,
}: {
	icon?: ReturnType<typeof createMarkerIcon>;
	position: [number, number];
	hidden?: boolean;
	children?: ReactNode;
}) {
	return (
		<Marker
			position={position}
			// @ts-ignore
			icon={createMarkerIcon(icon)}
			hidden={hidden}
		>
			<Popup>{children}</Popup>
		</Marker>
	);
}
