// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles'
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import IconHome from '@mui/icons-material/Home';
import IconBike from '@mui/icons-material/DirectionsBike';
import IconRoute from '@mui/icons-material/Route';
import MyHead from '../../../components/MyHead';
import Paper from '@mui/material/Paper';
import Switch, {SwitchProps} from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Title from '../../../components/Title';
import Typography from '@mui/material/Typography';
import OpenStreetMap from '../../../components/map/OpenStreetMap';
import MapMarker from '../../../components/map/Marker';
import Course from '../../../components/map/Course';
import RoutePlanner from '../../../components/map/RoutePlanner';
import CourseList from '../../../components/CourseList';
import StartButton from '../../../components/StartButton';
import ImportCourse from '../../../components/ImportCourse';
import Ele from '../../../components/map/Ele';
import { CourseData, getMapBounds, gpxDocument2obj, parseGpxFile2Document } from '../../../lib/gpx_parser';
import { PersistedCourse, saveCourse } from '../../../lib/course_storage';

type OpenStreetMapArg = Parameters<typeof OpenStreetMap>[0];
type MapMarkerArg = Parameters<typeof MapMarker>[0];
type CourseArg = Parameters<typeof Course>[0];
type RoutePlannerArg = Parameters<typeof RoutePlanner>[0];

const DynamicMap = dynamic<OpenStreetMapArg>(() => import('../../../components/map/OpenStreetMap'), {
	ssr: false,
});
const DynamicMapMarker = dynamic<MapMarkerArg>(() => import('../../../components/map/Marker'), {
	ssr: false,
});
const DynamicCourse = dynamic<CourseArg>(() => import('../../../components/map/Course'), {
	ssr: false,
});
const DynamicRoutePlanner = dynamic<RoutePlannerArg>(
	() => import('../../../components/map/RoutePlanner'),
	{ ssr: false },
);

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
}))

function MyLocationButton({ map, setPosition }) {
	const getMyLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
				const pos = [position.coords.latitude, position.coords.longitude];
				setPosition(pos);
				if (map) {
					map.flyTo(pos, map.getZoom());
				}
			});
		} else {
			console.warn('Geolocation is not supported by this browser.');
		}
	};

	return (
		<Button variant="outlined" onClick={getMyLocation}>
			Get My Location
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
		if (editMode || animFrames.length === 0) return;

		const timer = setInterval(() => {
			setBikeAnimTick((t) => t + 1);
		}, ANIM_INTERVAL_MS);

		return () => clearInterval(timer);
	}, [editMode, animFrames]);

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
		course &&
		(course.tracks[0]?.segments[0]?.trackpoints?.length > 0 || course.routes[0]?.routepoints?.length > 0);
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
	const importGpx = async (file: File) => {
		let data: CourseData | null;

		try {
			const xmlDoc = await parseGpxFile2Document(file);

			data = gpxDocument2obj(xmlDoc);
		} catch (err) {
			console.error('Would be nice to show this:', err);
		}

		return data;
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
		if (!course) return;
		await saveCourse(courseName, '', course);
		setLastSavedCourse(course);
		setChangeCount((c) => c + 1);
	};

	return (
		<Container maxWidth="md">
			<MyHead title="Map Ride" />
			<Box>
				<Title href="/ride">Map Ride</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Plan a route or import a GPX file.
				</Typography>

				<Grid container spacing={2}>
					<Grid item xs={12} sm={4}>
						<Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>Courses</Typography>
					</Grid>
					<Grid item xs={12} sm={2}>
						<TextField
							value={courseName}
							onChange={(e) => setCourseName(e.target.value)}
							variant="standard"
							size="small"
							label="Course name"
							inputProps={{ maxLength: 200 }}
							sx={{ width: '100%' }}
							color={hasUnsavedChanges ? 'warning' : 'primary'}
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
							<ImportCourse newCourse={newCourse} />
							<MyLocationButton map={map} setPosition={setHomeCoord} />
							<Button
								variant="outlined"
								color="error"
								onClick={handleClearMap}
								sx={{ borderColor: 'error.light' }}
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
									sx={{ ml: 1, textTransform: 'uppercase' }}
								/>
							</FormGroup>
							<Button
								variant="contained"
								color="success"
								onClick={saveCurrentRoute}
								disabled={!hasUnsavedChanges}
							>
								Save Route
							</Button>
						</Box>
					</Grid>

					<Grid item xs={12} md={4}>
						<CourseList height={'50%'} changeId={changeCount} onSelectCourse={selectCourse} />
						<Paper elevation={0} sx={{ height: '49%', mt: 1 }}>
							<Ele
								course={course}
								showMarker={(en: boolean) => setShowMarker(en)}
								moveMarker={setMarkerCoord}
							/>
						</Paper>
					</Grid>

					<Grid item xs={12} md={8}>
						<Box sx={{
							borderRadius: 1,
							overflow: 'hidden',
							border: 2,
							borderColor: editMode ? 'primary.main' : 'transparent',
							transition: 'border-color 0.2s ease-out',
						}}>
						<DynamicMap center={homeCoord} width={'100%'} height={mapHeight} setMap={setMap} ariaLabel="Route planner map">
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
				</Grid>
				<StartButton disabled={editMode} href={`/ride/record?type=map&mapId=todo`} />
			</Box>
		</Container>
	);
}
