// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useReducer, useEffect, useRef } from 'react';
import { useMap, useMapEvents, Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { CourseData, Coord } from '../../lib/gpx_parser';
import { getElevations } from '../../lib/elevation';
import { getOsrmRoute } from '../../lib/routing';
import { routeColors } from '../../lib/tokens';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

/** Coordinate with optional elevation — flows through the reducer so
 *  existing ele data (e.g. from a GPX import) is preserved. */
type EleCoord = Coord & { ele?: number };

type RoutePlannerState = {
	/** User-placed or loaded anchor waypoints. */
	waypoints: Coord[];
	/**
	 * Routed segments:
	 *   segments[0] = [waypoints[0]]  (single-point seed)
	 *   segments[i>0] = OSRM route from waypoints[i-1] to waypoints[i],
	 *                   with the first coordinate omitted to avoid duplication.
	 */
	segments: EleCoord[][];
	isRouting: boolean;
};

type RoutePlannerAction =
	| { type: 'ADD_POINT'; waypoint: Coord; segment: EleCoord[] }
	| { type: 'MOVE_WAYPOINT'; index: number; waypoint: Coord; prevSegment?: EleCoord[]; nextSegment?: EleCoord[] }
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
		case 'MOVE_WAYPOINT': {
			const newWaypoints = [...state.waypoints];
			const newSegments = [...state.segments];
			newWaypoints[action.index] = action.waypoint;
			// When the first waypoint moves, update its seed segment too.
			if (action.index === 0) {
				newSegments[0] = [action.waypoint];
			}
			// Segment coming INTO this waypoint from the previous one.
			if (action.prevSegment !== undefined && action.index > 0) {
				newSegments[action.index] = action.prevSegment;
			}
			// Segment going OUT from this waypoint to the next one.
			if (action.nextSegment !== undefined && action.index + 1 < state.segments.length) {
				newSegments[action.index + 1] = action.nextSegment;
			}
			return { ...state, waypoints: newWaypoints, segments: newSegments, isRouting: false };
		}
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

/**
 * Build an initial planner state from an existing course by sampling up to
 * MAX_WAYPOINTS evenly-spaced anchor points from the course's trackpoints.
 * All segments of the first track are combined so that a GPX activity with
 * pause/resume gaps (multiple `<trkseg>` elements) is handled correctly.
 */
const MAX_INITIAL_WAYPOINTS = 15;

function courseToInitialState(course: CourseData | null | undefined): RoutePlannerState {
	// Collect all trackpoints across every segment of the first track so that
	// multi-segment activities (GPS paused/resumed) are fully represented.
	const trackpoints = course?.tracks[0]?.segments.flatMap((s) => s.trackpoints) ?? [];
	if (trackpoints.length === 0) return { waypoints: [], segments: [], isRouting: false };

	if (trackpoints.length === 1) {
		const wp: Coord = { lat: trackpoints[0].lat, lon: trackpoints[0].lon };
		return { waypoints: [wp], segments: [[wp]], isRouting: false };
	}

	// Sample evenly-spaced indices, always including the last trackpoint.
	const samplingInterval = Math.max(1, Math.floor((trackpoints.length - 1) / (MAX_INITIAL_WAYPOINTS - 1)));
	const indices: number[] = [];
	for (let i = 0; i < trackpoints.length - 1; i += samplingInterval) {
		indices.push(i);
	}
	indices.push(trackpoints.length - 1);
	const uniqueIndices = [...new Set(indices)];

	const waypoints: Coord[] = uniqueIndices.map((i) => ({
		lat: trackpoints[i].lat,
		lon: trackpoints[i].lon,
	}));

	// segments[0] = seed.
	// segments[i>0] = trackpoints from (prevIdx + 1) to currIdx inclusive,
	//   which matches the ADD_POINT convention (first coord = prevWp is omitted).
	// Preserve ele when available so we don't re-fetch known elevation data.
	const segments: EleCoord[][] = [
		[{ ...waypoints[0], ele: trackpoints[uniqueIndices[0]].ele }],
		...uniqueIndices.slice(1).map((endIdx, j) => {
			const startIdx = uniqueIndices[j] + 1;
			return trackpoints.slice(startIdx, endIdx + 1).map((tp) => ({ lat: tp.lat, lon: tp.lon, ele: tp.ele }));
		}),
	];

	return { waypoints, segments, isRouting: false };
}

function createWaypointIcon(type: 'start' | 'end' | 'via') {
	const colors: Record<typeof type, string> = {
		start: routeColors.start,
		end: routeColors.end,
		via: routeColors.via,
	};
	const color = colors[type];
	const size = type === 'via' ? 10 : 14;
	return L.divIcon({
		className: '',
		html: `<div style="
			width:${size}px;height:${size}px;
			background:${color};
			border:2px solid #fafafa;
			border-radius:50%;
			box-shadow:0 1px 4px rgba(0,0,0,0.5);
			cursor:grab;
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
					`background:${routeColors.routeLine};color:#fff;padding:5px 12px;border-radius:4px;` +
					'font-size:12px;font-weight:500;box-shadow:0 1px 5px rgba(0,0,0,0.3);pointer-events:none;';
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

export default function RoutePlanner({
	setCourse,
	initialCourse,
}: {
	setCourse: (c: CourseData) => void;
	initialCourse?: CourseData | null;
}) {
	const [state, dispatch] = useReducer(routePlannerReducer, initialCourse, courseToInitialState);

	// Keep setCourse in a ref so the sync effect never goes stale.
	const setCourseRef = useRef(setCourse);
	useEffect(() => {
		setCourseRef.current = setCourse;
	});

	// Keep a stable ref to state for async drag/click handlers.
	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	});

	// Track whether this is the initial mount — skip the first sync so that
	// loading an existing course doesn't mark it as unsaved immediately.
	const isMountedRef = useRef(false);

	// Sync the parent course whenever the accumulated segments change.
	// Elevation is fetched asynchronously and patched in once available.
	const elevationRequestRef = useRef(0);
	const elevationAbortRef = useRef<AbortController | null>(null);

	// Elevation cache: stores previously-fetched elevation keyed by
	// "lat,lon" (rounded to 6 dp).  The reducer's segment data never
	// receives the API-enriched ele values (they flow only to the parent
	// via setCourse), so without this cache every subsequent edit would
	// emit an all-zero elevation profile while waiting for the API.
	const eleCacheRef = useRef<Map<string, number>>(new Map());
	const coordKey = (c: { lat: number; lon: number }) => `${c.lat.toFixed(6)},${c.lon.toFixed(6)}`;

	useEffect(() => {
		if (!isMountedRef.current) {
			isMountedRef.current = true;
			return;
		}
		if (state.segments.length === 0) return;

		// Abort any in-flight elevation request from a previous render.
		elevationAbortRef.current?.abort();
		const abortCtrl = new AbortController();
		elevationAbortRef.current = abortCtrl;

		// Flatten all segments. Each segment[i>0] already excludes the
		// preceding waypoint (stored via routeCoords.slice(1) in ADD_POINT),
		// so a plain flat() produces the complete, non-duplicated path.
		const fullPath = state.segments.flat();

		// Pre-fill elevation from cache for points the reducer doesn't know.
		const cache = eleCacheRef.current;
		for (const pt of fullPath) {
			if (pt.ele == null) {
				const cached = cache.get(coordKey(pt));
				if (cached !== undefined) pt.ele = cached;
			}
		}

		// Emit immediately with whatever elevation data we already have.
		const emitCourse = (path: EleCoord[]) => {
			setCourseRef.current({
				tracks: [
					{
						segments: [
							{
								trackpoints: path.map(({ lat, lon, ele }) => ({
									lat,
									lon,
									ele: ele ?? 0,
								})),
							},
						],
					},
				],
				routes: [],
				waypoints: [],
			});
		};

		emitCourse(fullPath);

		// Identify points that are missing elevation data.
		const missingIndices = fullPath.map((pt, i) => (pt.ele == null ? i : -1)).filter((i) => i !== -1);

		// If all points already have elevation, nothing to fetch.
		if (missingIndices.length === 0) return;

		// Subsample the missing-elevation points to avoid excessive API calls.
		// We query at most ~200 evenly-spaced missing points and interpolate
		// between them for the remaining gaps.
		const requestId = ++elevationRequestRef.current;
		const MAX_QUERY = 200;
		let sampledMissingIndices: number[];
		if (missingIndices.length <= MAX_QUERY) {
			sampledMissingIndices = missingIndices;
		} else {
			const stride = Math.max(1, Math.floor(missingIndices.length / MAX_QUERY));
			sampledMissingIndices = [];
			for (let i = 0; i < missingIndices.length; i += stride) {
				sampledMissingIndices.push(missingIndices[i]);
			}
			if (sampledMissingIndices[sampledMissingIndices.length - 1] !== missingIndices[missingIndices.length - 1]) {
				sampledMissingIndices.push(missingIndices[missingIndices.length - 1]);
			}
		}

		const sampledCoords = sampledMissingIndices.map((i) => fullPath[i]);

		getElevations(sampledCoords, abortCtrl.signal)
			.then((elevations) => {
				if (requestId !== elevationRequestRef.current) return;
				if (abortCtrl.signal.aborted) return;

				// Map sampled results back: index in fullPath → fetched ele.
				const fetchedEle = new Map<number, number>();
				sampledMissingIndices.forEach((idx, j) => fetchedEle.set(idx, elevations[j]));

				// Build full elevation array: keep existing ele, fill gaps
				// by interpolating between the nearest fetched samples.
				const enrichedPath: EleCoord[] = fullPath.map((pt) => ({ ...pt }));

				// First, stamp fetched values.
				for (const [idx, ele] of fetchedEle) {
					enrichedPath[idx].ele = ele;
				}

				// Linearly interpolate the remaining missing points that sit
				// between two fetched samples.
				for (let s = 0; s < sampledMissingIndices.length - 1; s++) {
					const startIdx = sampledMissingIndices[s];
					const endIdx = sampledMissingIndices[s + 1];
					const startEle = elevations[s];
					const endEle = elevations[s + 1];
					const span = endIdx - startIdx;
					for (let j = startIdx + 1; j < endIdx; j++) {
						if (enrichedPath[j].ele != null) continue; // already known
						const t = (j - startIdx) / span;
						enrichedPath[j].ele = startEle + t * (endEle - startEle);
					}
				}

				// Populate the cache so the next immediate emit already has
				// elevation for these coordinates.
				for (const pt of enrichedPath) {
					if (pt.ele != null) {
						cache.set(coordKey(pt), pt.ele);
					}
				}

				emitCourse(enrichedPath);
			})
			.catch((err) => {
				if (abortCtrl.signal.aborted) return;
				console.warn('Elevation lookup failed, continuing without elevation:', err);
			});

		return () => {
			abortCtrl.abort();
		};
	}, [state.segments]);

	const handleUndo = () => dispatch({ type: 'UNDO' });

	const handleClear = () => {
		dispatch({ type: 'CLEAR' });
		eleCacheRef.current.clear();
		setCourseRef.current({ tracks: [], routes: [], waypoints: [] });
	};

	/** Re-route the segments adjacent to a dragged waypoint. */
	const handleMoveWaypoint = async (index: number, newWp: Coord) => {
		const { waypoints, isRouting } = stateRef.current;
		if (isRouting) return;
		dispatch({ type: 'SET_ROUTING', value: true });

		let prevSegment: Coord[] | undefined;
		let nextSegment: Coord[] | undefined;

		try {
			if (index > 0) {
				const routeCoords = await getOsrmRoute([waypoints[index - 1], newWp]);
				prevSegment = routeCoords.slice(1);
			}
			if (index < waypoints.length - 1) {
				const routeCoords = await getOsrmRoute([newWp, waypoints[index + 1]]);
				nextSegment = routeCoords.slice(1);
			}
		} catch (err) {
			console.error('OSRM routing failed during waypoint drag, falling back to straight line:', err);
			if (index > 0) prevSegment = [newWp];
			if (index < waypoints.length - 1) nextSegment = [waypoints[index + 1]];
		}

		dispatch({ type: 'MOVE_WAYPOINT', index, waypoint: newWp, prevSegment, nextSegment });
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
			// Use stateRef to avoid stale-closure issues in async handlers.
			const { isRouting, waypoints } = stateRef.current;
			if (isRouting) return;

			const newWp: Coord = { lat: e.latlng.lat, lon: e.latlng.lng };

			if (waypoints.length === 0) {
				// First waypoint – seed the first segment with a single point.
				dispatch({ type: 'ADD_POINT', waypoint: newWp, segment: [newWp] });
				return;
			}

			dispatch({ type: 'SET_ROUTING', value: true });
			const prevWp = waypoints[waypoints.length - 1];

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
	// Each segment[i>0] already excludes its preceding waypoint, so .flat()
	// produces the complete path without duplicating boundary coordinates.
	const routedPath: [number, number][] = state.segments.flat().map(({ lat, lon }) => [lat, lon]);

	return (
		<>
			<MapCursorCrosshair />
			<RoutePlannerControls onUndo={handleUndo} onClear={handleClear} />
			<RoutingStatusControl isRouting={state.isRouting} />

			{routedPath.length > 1 && (
				<Polyline
					positions={routedPath}
					pathOptions={{ color: routeColors.routeLine, weight: 4, opacity: 0.85 }}
				/>
			)}

			{state.waypoints.map(({ lat, lon }, i) => {
				const isStart = i === 0;
				const isEnd = i === state.waypoints.length - 1;
				const type = isStart ? 'start' : isEnd ? 'end' : 'via';
				const label = isStart ? 'Start' : isEnd ? 'End' : `Waypoint ${i + 1}`;
				// draggable and icon are not in react-leaflet's MarkerProps typings.
				const markerProps = {
					position: [lat, lon] as [number, number],
					draggable: true,
					icon: createWaypointIcon(type),
					eventHandlers: {
						dragend: (e: { target: L.Marker }) => {
							const latlng = e.target.getLatLng();
							handleMoveWaypoint(i, { lat: latlng.lat, lon: latlng.lng });
						},
					},
				};
				return (
					<Marker key={i} {...markerProps}>
						<Tooltip>{label}</Tooltip>
					</Marker>
				);
			})}
		</>
	);
}
