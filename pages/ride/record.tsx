// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import DefaultErrorPage from 'next/error';
import Grid from '@mui/material/Grid';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo, useRef } from 'react';
import FlightRecorder from 'components/record/FlightRecorder';
import DummyCard from 'components/record/DummyCard';
import MeasurementCard from 'components/record/MeasurementCard';
import MyHead from 'components/MyHead';
import PauseModal from 'components/record/PauseModal';
import ResistanceControl, { Resistance } from 'components/record/ResistanceControl';
import Ride from 'components/record/Ride';
import Stopwatch from 'components/record/Stopwatch';
import Title from 'components/Title';
import WorkoutController from 'components/record/WorkoutController';
import { LapTriggerMethod } from 'lib/activity_log';
import { RecordActionButtons } from 'components/record/ActionButtons';
import { useGlobalState } from 'lib/global';
import { PowerLimits } from 'components/ride/PowerResistance';
import useInterval from 'lib/use-interval';
import { useHeartRateMeasurement, getCyclingSpeedMeasurement } from 'lib/measurements';
import DataGraph, { measurementColors } from 'components/DataGraph';
import { gpxDocument2obj, parseGpxText2Document } from 'lib/gpx_parser';
import {
	getTimedTrackpoints,
	calcGpsPlaybackRate,
	calcAveragePlaybackRate,
} from 'lib/virtual_video';

const EMULATOR_ENABLED = process.env.NEXT_PUBLIC_TRAINER_EMULATOR === '1';
// Conditionally import the overlay so it is excluded from non-emulator builds.
// eslint-disable-next-line @typescript-eslint/no-empty-function
let TrainerEmulatorOverlay: () => JSX.Element | null = () => null;
if (EMULATOR_ENABLED) {
	// This dynamic require is intentional: when the env flag is false the
	// bundler tree-shakes this branch away.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	TrainerEmulatorOverlay = require('components/TrainerEmulator').TrainerEmulatorOverlay;
}

const PREFIX = 'record';

const classes = {
	colorPower: `${PREFIX}-colorPower`,
	colorSpeed: `${PREFIX}-colorSpeed`,
	colorHeartRate: `${PREFIX}-colorHeartRate`,
	pauseStopwatch: `${PREFIX}-pauseStopwatch`,
};

const StyledContainer = styled(Container)(({ theme }) => ({
	[`& .${classes.colorPower}`]: {
		background: measurementColors[1],
	},

	[`& .${classes.colorSpeed}`]: {
		background: measurementColors[2],
	},

	[`& .${classes.colorHeartRate}`]: {
		background: measurementColors[0],
	},

	[`& .${classes.pauseStopwatch}`]: {
		textAlign: 'center',
	},
}));

type RideType = 'free' | 'workout' | 'virtual';

function DataGraphCard() {
	const [logger] = useGlobalState('currentActivityLog');

	return (
		<Grid item xs={12}>
			<DataGraph logger={logger} type="lap" />
		</Grid>
	);
}

function FreeRideDashboard() {
	const router = useRouter();
	const isBreakpoint = useMediaQuery('(min-width:800px)');
	const [logger] = useGlobalState('currentActivityLog');
	const { resistance } = router.query;
	const rollingResistance = Number(router.query.rollingResistance);
	const powerLimits: PowerLimits = {
		min: Number(router.query.minPower) || 0,
		max: Number(router.query.maxPower) || 0,
	};

	if (typeof resistance !== 'string' || !['basic', 'power', 'slope'].includes(resistance)) {
		return <DefaultErrorPage statusCode={400} />;
	}

	return (
		<Box>
			<Title disableBack={true}>Free Ride</Title>

			<Grid container direction="row" alignItems="center" spacing={2}>
				<Ride />
				{logger ? (
					<ResistanceControl
						resistance={resistance as Resistance}
						rollingResistance={rollingResistance}
						powerLimits={powerLimits}
					/>
				) : (
					<DummyCard />
				)}
				{isBreakpoint
					? [
							<MeasurementCard type="cycling_cadence" key="1" />,
							<MeasurementCard type="cycling_speed" ribbonColor={classes.colorSpeed} key="2" />,
							<MeasurementCard type="cycling_power" ribbonColor={classes.colorPower} key="3" />,
							<MeasurementCard type="heart_rate" ribbonColor={classes.colorHeartRate} key="4" />,
						]
					: ''}
				<DataGraphCard />
			</Grid>
		</Box>
	);
}

function WorkoutDashboard({
	setMeta,
	doSplit,
	endRide,
}: {
	setMeta: (avatar: string, name: string) => void;
	doSplit: (time: number, triggerMethod: LapTriggerMethod) => void;
	endRide: (notes?: string) => void;
}) {
	const router = useRouter();

	const [logger] = useGlobalState('currentActivityLog');
	const { id } = router.query;

	// TODO should also check if router.isReady
	if (typeof id !== 'string') {
		return <DefaultErrorPage statusCode={400} />;
	}

	return (
		<Box>
			<Title disableBack={true}>Workout</Title>

			<Grid container direction="row" alignItems="center" spacing={2}>
				<Ride />
				{logger ? <WorkoutController setMeta={setMeta} doSplit={doSplit} endRide={endRide} /> : <DummyCard />}
				<MeasurementCard type="cycling_cadence" />
				<MeasurementCard type="cycling_speed" ribbonColor={classes.colorSpeed} />
				<MeasurementCard type="cycling_power" ribbonColor={classes.colorPower} />
				<MeasurementCard type="heart_rate" ribbonColor={classes.colorHeartRate} />
				<DataGraphCard />
			</Grid>
		</Box>
	);
}

/** Return true only when url is a safe HTTP(S) URL, preventing open-redirect/XSS. */
function isSafeUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
}

function VirtualRideDashboard() {
	const router = useRouter();
	const { videoUrl, gpxUrl, syncMethod, avgSpeedKmh } = router.query;
	const videoRef = useRef<HTMLVideoElement>(null);
	const [ridePaused] = useGlobalState('ridePaused');
	const [gpxError, setGpxError] = useState<string | null>(null);
	// True when the video was auto-paused because the rider's speed dropped to zero.
	const speedPausedRef = useRef(false);

	// GPX timed trackpoints, only needed for GPS sync
	const [gpxPoints, setGpxPoints] = useState<ReturnType<typeof getTimedTrackpoints>>([]);

	useEffect(() => {
		if (syncMethod !== 'gps' || typeof gpxUrl !== 'string' || !gpxUrl) return;
		if (!isSafeUrl(gpxUrl)) {
			console.error('Invalid GPX URL – must be HTTP or HTTPS.');
			return;
		}

		fetch(gpxUrl)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.text();
			})
			.then((text) => {
				const doc = parseGpxText2Document(text);
				const gpxData = gpxDocument2obj(doc);
				setGpxPoints(getTimedTrackpoints(gpxData));
			})
			.catch((err: Error) => {
				console.error('Failed to load GPX for virtual ride:', err);
				setGpxError(`Failed to load GPS data: ${err.message}. Video will play at constant speed.`);
			});
	}, [gpxUrl, syncMethod]);

	// Pause / resume the video when the ride is paused
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		if (ridePaused !== 0) {
			video.pause();
		} else {
			// User manually resumed – clear the speed-pause flag so the interval can
			// restart playback once speed is non-zero.
			speedPausedRef.current = false;
			video.play().catch((err: Error) => {
				console.log('Autoplay blocked, user gesture required:', err.message);
			});
		}
	}, [ridePaused]);

	// Adjust playback rate every second based on current speed
	useInterval(async () => {
		const video = videoRef.current;
		if (!video || ridePaused !== 0) return;

		const speedMeas = getCyclingSpeedMeasurement();
		const currentSpeedMs = speedMeas?.speed ?? 0;

		// Pause when the rider is stationary; auto-resume when they start moving again.
		if (currentSpeedMs === 0) {
			if (!video.paused) {
				video.pause();
				speedPausedRef.current = true;
			}
			return;
		}
		if (speedPausedRef.current && video.paused) {
			speedPausedRef.current = false;
			video.play().catch((err: Error) => {
				console.log('Could not resume video after speed-pause:', err.message);
			});
		}

		if (video.paused) return;

		if (syncMethod === 'gps' && gpxPoints.length >= 2) {
			const rate = calcGpsPlaybackRate(gpxPoints, video.currentTime, currentSpeedMs);
			if (rate !== null) video.playbackRate = rate;
		} else if (syncMethod === 'average' && typeof avgSpeedKmh === 'string') {
			const avg = parseFloat(avgSpeedKmh);
			if (!Number.isNaN(avg) && avg > 0) {
				video.playbackRate = calcAveragePlaybackRate(avg, currentSpeedMs);
			}
		}
	}, 1000);

	if (typeof videoUrl !== 'string' || !videoUrl || !isSafeUrl(videoUrl)) {
		return <DefaultErrorPage statusCode={400} />;
	}

	return (
		<Box
			sx={{
				position: 'relative',
				width: '100%',
				height: 'calc(100vh - 56px)', // 56px = MUI BottomNavigation height
				background: '#000',
				display: 'flex',
				alignItems: 'center',
				overflow: 'hidden',
			}}
		>
			<video
				ref={videoRef}
				src={videoUrl}
				style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
				playsInline
			/>
			{gpxError && (
				<Box
					sx={{
						position: 'absolute',
						top: 8,
						left: 0,
						width: '100%',
						textAlign: 'center',
						color: 'warning.main',
						bgcolor: 'rgba(0,0,0,0.6)',
						px: 2,
						py: 0.5,
						fontSize: '0.85rem',
					}}
				>
					{gpxError}
				</Box>
			)}
			{/* Overlay ride data */}
			<Box
				sx={{
					position: 'absolute',
					top: gpxError ? 48 : 0,
					left: 0,
					width: '100%',
					pointerEvents: 'none',
					padding: 1,
				}}
			>
				<Grid
					container
					direction="row"
					spacing={1}
					sx={{
						'& .MuiCard-root': {
							opacity: 0.85,
							backdropFilter: 'blur(4px)',
						},
					}}
				>
					<Ride />
					<MeasurementCard type="cycling_cadence" />
					<MeasurementCard type="cycling_speed" ribbonColor={classes.colorSpeed} />
					<MeasurementCard type="cycling_power" ribbonColor={classes.colorPower} />
					<MeasurementCard type="heart_rate" ribbonColor={classes.colorHeartRate} />
				</Grid>
			</Box>
		</Box>
	);
}

function getRideType(rideType: string | string[]): RideType {
	switch (rideType) {
		case 'free':
		case 'workout':
		case 'virtual':
			return rideType;
		default:
			return undefined;
	}
}

function getDashboardConfig(rideType: RideType) {
	switch (rideType) {
		case 'free':
			return {
				title: 'Free Ride',
				Dashboard: FreeRideDashboard,
			};
		case 'workout':
			return {
				title: 'Workout',
				Dashboard: WorkoutDashboard,
			};
		case 'virtual':
			return {
				title: 'Virtual Ride',
				Dashboard: VirtualRideDashboard,
			};
		default:
			return {};
	}
}

export default function RideRecord() {
	const router = useRouter();
	const rideType = getRideType(router.query.type);
	const autoSplit: string | null = typeof router.query.split === 'string' ? router.query.split : null;
	const [ridePaused, setRidePaused] = useGlobalState('ridePaused');
	const [currentActivityLog] = useGlobalState('currentActivityLog');
	const [rideStartTime, setRideStartTime] = useState(0);
	const [elapsedLapTime, setElapsedLapTime] = useGlobalState('elapsedLapTime');
	const [lapDistance] = useGlobalState('lapDistance');
	const { heartRate } = useHeartRateMeasurement() ?? { heartRate: 0 };
	const [rideEnded, setRideEnded] = useState<boolean>(false);
	const { title, Dashboard } = useMemo(() => getDashboardConfig(rideType), [rideType]);

	// Prevent screen locking while recording
	useEffect(() => {
		let wakeLock = null;

		(async () => {
			try {
				// @ts-ignore
				wakeLock = await navigator.wakeLock.request('screen');
				console.log('WakeLock acquired');
			} catch (err) {
				console.log(`WakeLock failed: ${err.name}, ${err.message}`);
			}
		})();

		return () => {
			wakeLock.release().then(() => console.log('WakeLock released'));
			wakeLock = null;
		};
	}, []);

	const pauseRide = () => {
		setRidePaused(Date.now());
	};
	const continueRide = () => {
		if (rideStartTime === 0) {
			const now = Date.now();
			console.log(`Set ride start time: ${now}`);
			setRideStartTime(now);
		}
		setRidePaused(0);
	};

	const doSplit = (time: number, triggerMethod: LapTriggerMethod) => {
		if (currentActivityLog) {
			currentActivityLog.lapSplit(time, triggerMethod);
			setElapsedLapTime(0);
		}
	};
	const handleManualSplit = () => {
		doSplit(Date.now(), 'Manual');
	};

	// auto split handling
	useInterval(async () => {
		if (!rideEnded && !ridePaused && !!autoSplit) {
			if (autoSplit.endsWith('min') && elapsedLapTime >= parseInt(autoSplit) * 60_000) {
				doSplit(Date.now(), 'Time');
			} else if (autoSplit.endsWith('km') && lapDistance >= parseInt(autoSplit) * 1000) {
				doSplit(Date.now(), 'Distance');
			} else if (autoSplit.endsWith('bpm') && heartRate >= parseInt(autoSplit)) {
				doSplit(Date.now(), 'HeartRate');
			}
		}
	}, 1000);

	const setMeta = (avatar: string, name: string) => {
		currentActivityLog.setAvatar(avatar);
		currentActivityLog.setName(name);
	};
	const endRide = (notes?: string) => {
		if (notes) {
			currentActivityLog.setNotes(notes);
		}
		setRidePaused(-1);
		setRideEnded(true);
		router.push('/ride/results');
	};
	const handleEndRide = () => {
		if (rideType === 'workout') {
			// Typically a workout would give us some results as notes at the
			// end of the ride.
			endRide('Inconclusive.');
		} else {
			endRide();
		}
	};

	if (!title) {
		return <DefaultErrorPage statusCode={400} />;
	} else {
		return (
			<StyledContainer maxWidth="md">
				<MyHead title={title} />
				<Dashboard setMeta={setMeta} doSplit={doSplit} endRide={endRide} />
				<FlightRecorder startTime={rideStartTime} />
				<PauseModal show={ridePaused === -1 && !rideEnded} onClose={continueRide}>
					<p id="pause-modal-description">Tap outside of this area to start the ride.</p>
				</PauseModal>
				<PauseModal show={ridePaused > 0} onClose={continueRide}>
					<p id="pause-modal-description">Tap outside of this area to continue.</p>
					<Stopwatch
						className={classes.pauseStopwatch}
						startTime={ridePaused}
						isPaused={ridePaused === 0 || ridePaused === -1}
					/>
				</PauseModal>
				<RecordActionButtons
					onClickPause={pauseRide}
					onClickSplit={handleManualSplit}
					onClickEnd={handleEndRide}
				/>
				{EMULATOR_ENABLED && <TrainerEmulatorOverlay />}
			</StyledContainer>
		);
	}
}
