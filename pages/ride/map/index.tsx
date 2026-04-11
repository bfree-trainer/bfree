// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import dynamic from 'next/dynamic';
import type L from 'leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import IconHome from '@mui/icons-material/Home';
import IconBike from '@mui/icons-material/DirectionsBike';
import IconRoute from '@mui/icons-material/Route';
import MyHead from '../../../components/MyHead';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Switch, { SwitchProps } from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Title from '../../../components/Title';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { OpenStreetMapArg } from '../../../components/map/OpenStreetMap';
import { MapMarkerArg } from '../../../components/map/Marker';
import { MapCourseArg as CourseArg } from '../../../components/map/Course';
import { RoutePlannerArg } from '../../../components/map/RoutePlanner';
import CourseList from '../../../components/CourseList';
import StartButton from '../../../components/StartButton';
import ImportCourse from '../../../components/ImportCourse';
import { EleArg } from '../../../components/map/Ele';
import { CourseData, getMapBounds, gpxDocument2obj, parseGpxFile2Document } from '../../../lib/gpx_parser';
import { PersistedCourse, saveCourse } from '../../../lib/course_storage';

const DynamicMap = dynamic<OpenStreetMapArg>(() => import('../../../components/map/OpenStreetMap'), {
	ssr: false,
});
const DynamicMapMarker = dynamic<MapMarkerArg>(() => import('../../../components/map/Marker'), {
	ssr: false,
});
const DynamicCourse = dynamic<CourseArg>(() => import('../../../components/map/Course'), {
	ssr: false,
});
const DynamicRoutePlanner = dynamic<RoutePlannerArg>(() => import('../../../components/map/RoutePlanner'), {
	ssr: false,
});
const DynamicEle = dynamic<EleArg>(() => import('../../../components/map/Ele'), { ssr: false });

const DEFAULT_COURSE_NAME = 'Untitled';

const RouteSwitch = styled((props: SwitchProps) => (
	<Switch
		focusVisibleClassName=".Mui-focusVisible"
		disableRipple
		{...props}
		icon={
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					width: 32,
					height: 32,
					borderRadius: '50%',
					backgroundColor: 'background.paper',
					boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
				}}
			>
				<IconRoute sx={{ fontSize: 20, color: 'text.secondary' }} />
			</Box>
		}
		checkedIcon={
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					width: 32,
					height: 32,
					borderRadius: '50%',
					backgroundColor: 'primary.main',
					boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
				}}
			>
				<IconRoute sx={{ fontSize: 20, color: 'common.white' }} />
			</Box>
		}
	/>
))(({ theme }) => ({
	width: 64,
	height: 36,
	padding: 0,
	margin: 8,
	'@media (pointer: coarse)': {
		height: 44,
		width: 72,
	},
	'& .MuiSwitch-switchBase': {
		padding: 2,
		'&.Mui-checked': {
			transform: 'translateX(28px)',
			'& + .MuiSwitch-track': {
				backgroundColor: theme.palette.primary.light,
				opacity: 1,
				border: 0,
			},
		},
	},
	'& .MuiSwitch-track': {
		borderRadius: 36 / 2,
		backgroundColor: theme.palette.grey[300],
		opacity: 1,
		transition: theme.transitions.create(['background-color'], {
			duration: 500,
		}),
	},
}));

function MyLocationButton({
	map,
	setPosition,
	onError,
}: {
	map: L.Map | null;
	setPosition: (pos: [number, number]) => void;
	onError: (msg: string) => void;
}) {
	const [loading, setLoading] = useState(false);

	const getMyLocation = () => {
		if (!navigator.geolocation) {
			onError('Geolocation is not supported by this browser.');
			return;
		}
		setLoading(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLoading(false);
				const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
				setPosition(pos);
				if (map) {
					map.flyTo(pos, map.getZoom());
				}
			},
			(err) => {
				setLoading(false);
				switch (err.code) {
					case err.PERMISSION_DENIED:
						onError('Location access was denied. Please enable location permissions.');
						break;
					case err.POSITION_UNAVAILABLE:
						onError('Location information is unavailable.');
						break;
					case err.TIMEOUT:
						onError('Location request timed out.');
						break;
					default:
						onError('An unknown error occurred while getting your location.');
				}
			},
			{ timeout: 10000 }
		);
	};

	return (
		<Button
			variant="outlined"
			onClick={getMyLocation}
			disabled={loading}
			sx={{ '@media (pointer: coarse)': { minHeight: 44 } }}
		>
			{loading ? <CircularProgress size={20} /> : 'My Location'}
		</Button>
	);
}

export default function RideMap() {
	const [map, setMap] = useState(null);
	const [editMode, setEditMode] = useState(false);
	/** Increment to force-remount the RoutePlanner (e.g. on "Clear Map"). */
	const [routePlannerKey, setRoutePlannerKey] = useState(0);
	const [showMarker, setShowMarker] = useState<boolean>(false);
	const [markerCoord, setMarkerCoord] = useState<[number, number]>([51.505, -0.09]);
	const [homeCoord, setHomeCoord] = useState<[number, number]>([51.505, -0.09]);
	const [course, setCourse] = useState<CourseData | null>(null);
	const [courseName, setCourseName] = useState<string>(DEFAULT_COURSE_NAME);
	const bounds = useMemo(() => course && getMapBounds(course), [course]);
	const mapHeight = 'clamp(300px, 55vh, 650px)';
	const [changeCount, setChangeCount] = useState<number>(0);
	/**
	 * Reference to the last saved version of the course.
	 * Used to detect unsaved changes by reference equality.
	 */
	const [lastSavedCourse, setLastSavedCourse] = useState<CourseData | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [snackMsg, setSnackMsg] = useState<string | null>(null);
	const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

	const handleShowMarker = useCallback((en: boolean) => setShowMarker(en), []);
	const handleCloseSnack = useCallback(() => setSnackMsg(null), []);

	// ---------------------------------------------------------------------------
	// Preview-mode animated bike marker
	// ---------------------------------------------------------------------------
	/** Number of evenly-spaced frames the animation is subsampled to. */
	const ANIM_FRAMES = 200;
	/** Milliseconds between each animation step → ~60 s for a full loop. */
	const ANIM_INTERVAL_MS = 300;
	/** Monotonically increasing counter advanced by the animation interval. */
	const [bikeAnimTick, setBikeAnimTick] = useState(0);

	/**
	 * Subsample course trackpoints to ANIM_FRAMES evenly-spaced positions used
	 * for the looping animation. Empty when there is no course.
	 */
	const animFrames = useMemo<[number, number][]>(() => {
		if (!course) return [];
		const allPoints = course.tracks
			.flatMap((t) => t.segments.flatMap((s) => s.trackpoints))
			.map((tp) => [tp.lat, tp.lon] as [number, number]);
		if (allPoints.length === 0) return [];
		if (allPoints.length <= ANIM_FRAMES) return allPoints;
		const step = (allPoints.length - 1) / (ANIM_FRAMES - 1);
		return Array.from({ length: ANIM_FRAMES }, (_, i) => allPoints[Math.round(i * step)]);
	}, [course]);

	useEffect(() => {
		if (editMode || animFrames.length === 0 || prefersReducedMotion) return;

		const timer = setInterval(() => {
			setBikeAnimTick((t) => t + 1);
		}, ANIM_INTERVAL_MS);

		return () => clearInterval(timer);
	}, [editMode, animFrames, prefersReducedMotion]);

	/**
	 * Current animated bike position derived from the tick counter.
	 * Null when in edit mode or no course is loaded.
	 */
	const bikeAnimPos: [number, number] | null =
		!editMode && animFrames.length > 0 ? animFrames[bikeAnimTick % animFrames.length] : null;

	/**
	 * Displayed bike position: elevation-chart hover takes priority; otherwise
	 * the looping animation drives the marker.
	 */
	const bikeDisplayPos = showMarker && markerCoord ? markerCoord : bikeAnimPos;

	const routeHasData =
		course && (course.tracks[0]?.segments[0]?.trackpoints?.length > 0 || course.routes[0]?.routepoints?.length > 0);
	const hasUnsavedChanges = Boolean(routeHasData && course !== lastSavedCourse);

	useEffect(() => {
		// Don't auto-zoom while the route planner is active — it would pan/zoom on every waypoint.
		if (editMode) return;
		if (
			map &&
			bounds &&
			[bounds.minlat, bounds.minlon, bounds.maxlat, bounds.maxlon].every((v) => Number.isFinite(v))
		) {
			map.fitBounds([
				[bounds.minlat, bounds.minlon],
				[bounds.maxlat, bounds.maxlon],
			]);
		}
	}, [map, bounds, editMode]);

	const clearCourseName = () => setCourseName(DEFAULT_COURSE_NAME);
	const importGpx = async (file: File): Promise<CourseData | null> => {
		try {
			const xmlDoc = await parseGpxFile2Document(file);
			return gpxDocument2obj(xmlDoc);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			setSnackMsg(`Failed to import GPX file: ${message}`);
			return null;
		}
	};
	const newCourse = (name: string, file: File) => {
		(async () => {
			let data: CourseData;

			if (file) {
				data = await importGpx(file);
				setCourse(data ?? null);
			} else {
				data = {
					tracks: [],
					routes: [],
					waypoints: [],
				};
				setCourse(null);
			}
			if (name) {
				// NOP
			} else if (data && data.routes.length && data.routes[0].name) {
				name = data.routes[0].name;
			} else if (data && data.tracks.length && data.tracks[0].name) {
				name = data.tracks[0].name;
			} else {
				name = DEFAULT_COURSE_NAME;
			}
			setCourseName(name);

			await saveCourse(name, '', data);
			setLastSavedCourse(data ?? null);
			setChangeCount(changeCount + 1);
		})();
	};
	const selectCourse = (persistedCourse: PersistedCourse) => {
		setCourse(persistedCourse.course);
		setLastSavedCourse(persistedCourse.course);
		setCourseName(persistedCourse.name);
		setEditMode(false);
		// Force RoutePlanner to remount so it re-initialises from the newly selected course.
		setRoutePlannerKey((k) => k + 1);
	};

	const handleClearMap = () => {
		setCourse(null);
		setLastSavedCourse(null);
		clearCourseName();
		// Force RoutePlanner to remount so its internal state is cleared too.
		setRoutePlannerKey((k) => k + 1);
	};

	const handleEditModeChange = (checked: boolean) => {
		setEditMode(checked);
	};

	/** Persist the current in-memory route to localStorage. */
	const saveCurrentRoute = async () => {
		if (!course || isSaving) return;

		const trimmedName = courseName.trim();
		if (!trimmedName) {
			setSnackMsg('Please enter a course name before saving.');
			return;
		}

		setIsSaving(true);
		try {
			await saveCourse(trimmedName, '', course);
			setCourseName(trimmedName);
			setLastSavedCourse(course);
			setChangeCount((c) => c + 1);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			setSnackMsg(`Failed to save course: ${message}`);
		} finally {
			setIsSaving(false);
		}
	};

	const mapContainerSx = useMemo(
		() => ({
			borderRadius: 1,
			overflow: 'hidden',
			border: 2,
			borderColor: editMode ? 'primary.main' : 'transparent',
			transition: 'border-color 0.2s ease-out',
		}),
		[editMode]
	);

	return (
		<Container maxWidth="md">
			<MyHead title="Map Ride" />
			<Box>
				<Title href="/ride">Map Ride</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Plan a route or import a GPX file.
				</Typography>

				<Grid container spacing={2}>
					{/* ── Header: course name + actions (left) | Courses label (right) ── */}
					<Grid item xs={12} md={8} sx={{ minWidth: 0 }}>
						<TextField
							value={courseName}
							onChange={(e) => setCourseName(e.target.value)}
							variant="standard"
							size="small"
							label="Course name"
							inputProps={{ maxLength: 200 }}
							sx={{ width: '100%', mb: 1 }}
							color={hasUnsavedChanges ? 'warning' : 'primary'}
						/>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
							<ImportCourse newCourse={newCourse} />
							<MyLocationButton map={map} setPosition={setHomeCoord} onError={setSnackMsg} />
							<Button
								variant="outlined"
								color="error"
								onClick={handleClearMap}
								sx={{ borderColor: 'error.light', '@media (pointer: coarse)': { minHeight: 44 } }}
							>
								Clear
							</Button>
							<FormGroup>
								<FormControlLabel
									control={
										<RouteSwitch
											name="edit"
											size="medium"
											checked={editMode}
											onChange={(e) => handleEditModeChange(e.target.checked)}
										/>
									}
									label="Edit"
									sx={{ ml: 0.5, textTransform: 'uppercase' }}
								/>
							</FormGroup>
							<Button
								variant="contained"
								color="success"
								onClick={saveCurrentRoute}
								disabled={!hasUnsavedChanges || isSaving}
								sx={{ '@media (pointer: coarse)': { minHeight: 44 } }}
							>
								{isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save Route'}
							</Button>
						</Box>
					</Grid>

					{/* ── Courses label: aligns with the sidebar column on desktop ── */}
					<Grid item xs={12} md={4} sx={{ minWidth: 0, display: 'flex', alignItems: 'flex-end' }}>
						<Typography
							variant="h6"
							color="primary.main"
							sx={{ fontWeight: 700 }}
						>
							Courses
						</Typography>
					</Grid>

					{/* ── Map: appears first on mobile via order ── */}
					<Grid item xs={12} md={8} sx={{ order: { xs: -1, md: 0 } }}>
						<Box sx={mapContainerSx}>
							<DynamicMap
								center={homeCoord}
								width={'100%'}
								height={mapHeight}
								setMap={setMap}
								ariaLabel="Route planner map"
							>
								<DynamicMapMarker icon={<IconHome />} position={homeCoord}>
									You are here.
								</DynamicMapMarker>
								<DynamicMapMarker
									icon={<IconBike />}
									position={bikeDisplayPos ?? markerCoord}
									hidden={!bikeDisplayPos}
								></DynamicMapMarker>
								{editMode ? (
									<DynamicRoutePlanner
										key={routePlannerKey}
										setCourse={setCourse}
										initialCourse={course}
									/>
								) : null}
								{course && !editMode ? <DynamicCourse course={course} /> : null}
							</DynamicMap>
						</Box>
					</Grid>

					{/* ── Sidebar: course list + elevation ── */}
					<Grid item xs={12} md={4} sx={{ minWidth: 0, order: { xs: 0, md: 0 } }}>
						<CourseList
							height={'clamp(160px, 30vh, 300px)'}
							changeId={changeCount}
							onSelectCourse={selectCourse}
						/>
						<Paper elevation={0} sx={{ height: 256, mt: 1 }}>
							<DynamicEle course={course} showMarker={handleShowMarker} moveMarker={setMarkerCoord} />
						</Paper>
					</Grid>
				</Grid>
				<StartButton disabled={editMode} href={`/ride/record?type=map&mapId=todo`} />
			</Box>
			<Snackbar
				open={snackMsg !== null}
				autoHideDuration={6000}
				onClose={handleCloseSnack}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert onClose={handleCloseSnack} severity="error" variant="filled" sx={{ width: '100%' }}>
					{snackMsg}
				</Alert>
			</Snackbar>
		</Container>
	);
}
