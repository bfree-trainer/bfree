// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useReducer, useEffect, useRef } from 'react';
import { useMap, useMapEvents, Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { CourseData, Coord } from '../../lib/gpx_parser';
import { getOsrmRoute } from '../../lib/routing';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

type RoutePlannerState = {
	/** User-clicked anchor points. */
	waypoints: Coord[];
	/**
	 * Routed segments:
	 *   segments[0] = [waypoints[0]]  (single-point seed for the first click)
	 *   segments[i>0] = OSRM route from waypoints[i-1] to waypoints[i],
	 *                   with the first coordinate omitted to avoid duplication.
	 */
	segments: Coord[][];
	isRouting: boolean;
};

type RoutePlannerAction =
	| { type: 'ADD_POINT'; waypoint: Coord; segment: Coord[] }
	| { type: 'UNDO' }
	| { type: 'CLEAR' }
	| { type: 'SET_ROUTING'; value: boolean };

function routePlannerReducer(state: RoutePlannerState, action: RoutePlannerAction): RoutePlannerState {
	switch (action.type) {
		case 'ADD_POINT':
			return {
				...state,
				waypoints: [...state.waypoints, action.waypoint],
				segments: [...state.segments, action.segment],
				isRouting: false,
			};
		case 'UNDO':
			if (state.waypoints.length === 0) return state;
			return {
				...state,
				waypoints: state.waypoints.slice(0, -1),
				segments: state.segments.slice(0, -1),
			};
		case 'CLEAR':
			return { waypoints: [], segments: [], isRouting: false };
		case 'SET_ROUTING':
			return { ...state, isRouting: action.value };
		default:
			return state;
	}
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function createWaypointIcon(type: 'start' | 'end' | 'via') {
	// Colors intentionally match the MUI default palette tokens:
	//   success.main = #4CAF50, error.main = #f44336, primary.main = #1976D2
	const colors: Record<typeof type, string> = {
		start: '#4CAF50',
		end: '#f44336',
		via: '#1976D2',
	};
	const color = colors[type];
	const size = type === 'via' ? 10 : 14;
	return L.divIcon({
		className: '',
		html: `<div style="
			width:${size}px;height:${size}px;
			background:${color};
			border:2px solid #fff;
			border-radius:50%;
			box-shadow:0 1px 4px rgba(0,0,0,0.5);
		"></div>`,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
	});
}

// ---------------------------------------------------------------------------
// Sub-components rendered inside the Leaflet map
// ---------------------------------------------------------------------------

/**
 * Adds a custom Leaflet toolbar with Undo / Clear buttons to the map.
 * Uses stable refs for callbacks so the control is only created once.
 */
function RoutePlannerControls({ onUndo, onClear }: { onUndo: () => void; onClear: () => void }) {
	const map = useMap();
	const onUndoRef = useRef(onUndo);
	const onClearRef = useRef(onClear);
	// Keep refs fresh after every render so the Leaflet control never holds stale callbacks.
	useEffect(() => {
		onUndoRef.current = onUndo;
		onClearRef.current = onClear;
	});

	useEffect(() => {
		const RoutePlannerCtrl = L.Control.extend({
			onAdd() {
				const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

				const undoBtn = L.DomUtil.create('a', '', container);
				undoBtn.title = 'Undo last waypoint';
				undoBtn.href = '#';
				undoBtn.setAttribute('role', 'button');
				undoBtn.setAttribute('aria-label', 'Undo last waypoint');
				undoBtn.innerHTML = '&#8617;'; // ↩
				L.DomEvent.on(undoBtn, 'click', (e) => {
					L.DomEvent.stopPropagation(e);
					L.DomEvent.preventDefault(e);
					onUndoRef.current();
				});

				const clearBtn = L.DomUtil.create('a', '', container);
				clearBtn.title = 'Clear route';
				clearBtn.href = '#';
				clearBtn.setAttribute('role', 'button');
				clearBtn.setAttribute('aria-label', 'Clear route');
				clearBtn.innerHTML = '&#x2715;'; // ✕
				L.DomEvent.on(clearBtn, 'click', (e) => {
					L.DomEvent.stopPropagation(e);
					L.DomEvent.preventDefault(e);
					onClearRef.current();
				});

				return container;
			},
		});

		const ctrl = new RoutePlannerCtrl({ position: 'topleft' });
		ctrl.addTo(map);
		return () => {
			ctrl.remove();
		};
	}, [map]);

	return null;
}

/** Shows a "Finding route…" status badge while OSRM is fetching. */
function RoutingStatusControl({ isRouting }: { isRouting: boolean }) {
	const map = useMap();

	useEffect(() => {
		if (!isRouting) return;

		const StatusCtrl = L.Control.extend({
			onAdd() {
				const container = L.DomUtil.create('div', 'leaflet-control');
				container.style.cssText =
					'background:rgba(255,255,255,0.9);padding:5px 10px;border-radius:4px;' +
					'font-size:12px;box-shadow:0 1px 5px rgba(0,0,0,0.3);pointer-events:none;';
				container.innerHTML = 'Finding route\u2026';
				return container;
			},
		});

		const ctrl = new StatusCtrl({ position: 'topright' });
		ctrl.addTo(map);
		return () => {
			ctrl.remove();
		};
	}, [map, isRouting]);

	return null;
}

/** Changes the map cursor to a crosshair while the route planner is active. */
function MapCursorCrosshair() {
	const map = useMap();

	useEffect(() => {
		const container = map.getContainer();
		container.style.cursor = 'crosshair';
		return () => {
			container.style.cursor = '';
		};
	}, [map]);

	return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RoutePlanner({ setCourse }: { setCourse: (c: CourseData) => void }) {
	const [state, dispatch] = useReducer(routePlannerReducer, {
		waypoints: [],
		segments: [],
		isRouting: false,
	});

	// Keep setCourse in a ref so the useEffect below never goes stale.
	const setCourseRef = useRef(setCourse);
	useEffect(() => {
		setCourseRef.current = setCourse;
	});

	// Sync the parent course whenever the accumulated segments change.
	useEffect(() => {
		if (state.segments.length === 0) return;

		// Flatten segments, skipping the first point of each segment after the
		// first to avoid duplicating boundary coordinates.
		const fullPath = state.segments.flatMap((seg, i) => (i === 0 ? seg : seg.slice(1)));

		setCourseRef.current({
			tracks: [
				{
					segments: [
						{
							trackpoints: fullPath.map(({ lat, lon }) => ({ lat, lon })),
						},
					],
				},
			],
			routes: [],
			waypoints: [],
		});
	}, [state.segments]);

	const handleUndo = () => dispatch({ type: 'UNDO' });

	const handleClear = () => {
		dispatch({ type: 'CLEAR' });
		setCourseRef.current({ tracks: [], routes: [], waypoints: [] });
	};

	// Keyboard shortcut: Ctrl/Cmd+Z → undo.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
				e.preventDefault();
				dispatch({ type: 'UNDO' });
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	useMapEvents({
		click: async (e) => {
			if (state.isRouting) return;

			const newWp: Coord = { lat: e.latlng.lat, lon: e.latlng.lng };

			if (state.waypoints.length === 0) {
				// First waypoint – seed the first segment with a single point.
				dispatch({ type: 'ADD_POINT', waypoint: newWp, segment: [newWp] });
				return;
			}

			dispatch({ type: 'SET_ROUTING', value: true });
			const prevWp = state.waypoints[state.waypoints.length - 1];

			try {
				const routeCoords = await getOsrmRoute([prevWp, newWp]);
				// Drop the first coordinate (it equals prevWp) to avoid duplication.
				dispatch({ type: 'ADD_POINT', waypoint: newWp, segment: routeCoords.slice(1) });
			} catch (err) {
				console.error('OSRM routing failed, falling back to straight line:', err);
				dispatch({ type: 'ADD_POINT', waypoint: newWp, segment: [newWp] });
			}
		},
	});

	// Flatten segments into a single [lat, lon][] array for the polyline.
	const routedPath: [number, number][] = state.segments
		.flatMap((seg, i) => (i === 0 ? seg : seg.slice(1)))
		.map(({ lat, lon }) => [lat, lon]);

	return (
		<>
			<MapCursorCrosshair />
			<RoutePlannerControls onUndo={handleUndo} onClear={handleClear} />
			<RoutingStatusControl isRouting={state.isRouting} />

			{routedPath.length > 1 && (
				<Polyline positions={routedPath} pathOptions={{ color: '#1976D2', weight: 4, opacity: 0.85 }} />
			)}

			{state.waypoints.map(({ lat, lon }, i) => (
				<Marker
					key={i}
					position={[lat, lon]}
					// @ts-expect-error icon prop not in react-leaflet type defs
					icon={createWaypointIcon(
						i === 0 ? 'start' : i === state.waypoints.length - 1 ? 'end' : 'via',
					)}
				>
					<Tooltip>
						{i === 0 ? 'Start' : i === state.waypoints.length - 1 ? `End (${i + 1} points)` : `Via point ${i}`}
					</Tooltip>
				</Marker>
			))}
		</>
	);
}
