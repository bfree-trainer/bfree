import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import IconResistance from '@mui/icons-material/FitnessCenter';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGlobalState, getGlobalState, ControlParams } from '../../lib/global';
import createWorkoutRunner, { RunnerResponse } from '../../lib/workout_runner';
import { readWorkout } from '../../lib/workout_storage';
import { LapTriggerMethod } from '../../lib/activity_log';
import {
	stdBikeFrontalArea,
	stdBikeDragCoefficient,
	rollingResistanceCoeff,
	calcWindResistanceCoeff,
} from '../../lib/virtual_params';
import {
	getCyclingCadenceMeasurement,
	getCyclingPowerMeasurement,
	getCyclingSpeedMeasurement,
	getHeartRateMeasurement,
} from '../../lib/measurements';
import { getDayPeriod } from '../../lib/locale';

const PREFIX = 'WorkoutController';

const classes = {
	inlineIcon: `${PREFIX}-inlineIcon`,
	stopwatchCard: `${PREFIX}-stopwatchCard`,
	value: `${PREFIX}-value`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.inlineIcon}`]: {
		fontSize: '18px !important',
	},

	[`& .${classes.stopwatchCard}`]: {
		height: '10em',
	},

	[`& .${classes.value}`]: {
		float: 'right',
	},
}));

export default function WorkoutController({
	setMeta,
	doSplit,
	endRide,
}: {
	setMeta: (avatar: string, name: string) => void;
	doSplit: (time: number, lapTrigger: LapTriggerMethod) => void;
	endRide: (notes?: string) => void;
}) {
	const router = useRouter();
	const [elapsedTime] = useGlobalState('elapsedTime');
	const [smartTrainerControl] = useGlobalState('smart_trainer_control');
	const [_controlParams, setControlParams] = useGlobalState('control_params');
	const [bike] = useGlobalState('bike');
	const [workoutRunner, setWorkoutRunner] = useState<ReturnType<typeof createWorkoutRunner>>();
	const altitude = 0;
	const windSpeed = 0; // head/tail component.
	const draftingFactor = 1.0; // 0.0 would be no air resistance simulation, where as 1.0 means no drafting effect.
	const windResistanceCoeff = useMemo(
		() => calcWindResistanceCoeff(stdBikeFrontalArea[bike.type], stdBikeDragCoefficient[bike.type], altitude),
		[bike]
	);
	const [message, setMessage] = useState('');

	const sendBasic = useCallback(async (value: number) => {
		await smartTrainerControl.sendBasicResistance(value);
	}, [smartTrainerControl]);

	const sendPower = useCallback(async (value: number) => {
		await smartTrainerControl.sendTargetPower(value);
	}, [smartTrainerControl]);
	const sendSlope = useCallback(async (value: number) => {
		await smartTrainerControl.sendWindResistance(windResistanceCoeff, windSpeed, draftingFactor);
		// TODO Configurable rolling resistance
		await smartTrainerControl.sendSlope(value, rollingResistanceCoeff.asphalt);
		setControlParams((prev: ControlParams) => ({ ...prev, slope: value }));
	},[setControlParams, smartTrainerControl, windResistanceCoeff]);

	// Load workout runner
	useEffect(() => {
		let wr: ReturnType<typeof createWorkoutRunner>;

		const { id: workoutId, type: rideType } = router.query;
		if (router.isReady && rideType === 'workout' && typeof workoutId === 'string') {
			let prevType;
			let prevValue;
			setWorkoutRunner((prevRunner) => {
				if (prevRunner) {
					// Hopefully we'll never end up doing this because this
					// could break the running exercise.
					prevRunner.terminate();
				}

				const { avatar, name, script } = readWorkout(workoutId) || {};
				if (!script) {
					// TODO We should show an error
					return null;
				}

				setMeta(avatar, `${name} ${getDayPeriod(new Date(Date.now()))}`);

				if (!smartTrainerControl) {
					// We cannot continue further on without
					// a smartTrainerControl
					// TODO Show error
					console.error('No smart trainer registered');
					return null;
				}

				wr = createWorkoutRunner(script);
				wr.onMessage((msg: RunnerResponse) => {
					// TODO Technically we should check that msg.time makes sense
					if (+!!msg.basicLoad + +!!msg.power + +!!msg.slope + +msg.doStop > 1) {
						// TODO Better error handling
						console.error('Only one of the three resistance controls can be set at once');
						return;
					}

					if (msg.doSplit) {
						doSplit(msg.time, msg.doSplit);
					} else if (msg.doStop && typeof msg.doStop === 'string') {
						endRide(msg.doStop);
					} else if (msg.doStop) {
						endRide();
					} else if (msg.basicLoad) {
						if (prevType != 'basicLoad' || prevValue != msg.basicLoad) {
							sendBasic(msg.basicLoad).catch(console.error);
						}
						prevType = 'basicLoad';
						prevValue = msg.basicLoad;
					} else if (msg.power) {
						if (prevType != 'power' || prevValue != msg.power) {
							sendPower(msg.power).catch(console.error);
						}
						prevType = 'power';
						prevValue = msg.power;
					} else if (msg.slope) {
						if (prevType != 'slope' || prevValue != msg.slope) {
							sendSlope(msg.slope).catch(console.error);
						}
						prevType = 'slope';
						prevValue = msg.slope;
					}

					if (msg.message) {
						setMessage((_prev) => msg.message);
					}
				});

				return wr;
			});
		}

		return () => {
			if (wr) {
				// Reset resistance to zero.
				sendBasic(0).catch(console.error);
				setControlParams((prev: ControlParams) => {
					const newParams = { ...prev };

					delete newParams.slope;

					return newParams;
				});

				wr.terminate();
			}
		};
	}, [doSplit, endRide, router.isReady, router.query, sendBasic, sendPower, sendSlope, setControlParams, setMeta, smartTrainerControl]);

	// Call the workout script on every tick.
	// How? We sort of cheat a bit, we never registered to any event but we
	// happen to know that elapsedTime is only updated at the tick of the
	// logger.
	useEffect(() => {
		if (!workoutRunner) {
			return;
		}

		const cadence = getCyclingCadenceMeasurement();
		const power = getCyclingPowerMeasurement();
		const speed = getCyclingSpeedMeasurement();
		const heartRate = getHeartRateMeasurement();
		const distance = getGlobalState('rideDistance');

		workoutRunner.sendMessage({
			time: elapsedTime,
			distance,
			speed: speed?.speed,
			cadence: cadence?.cadence,
			heartRate: heartRate?.heartRate,
			power: power?.power,
		});
	}, [workoutRunner, elapsedTime]);

	/* TODO Show the actual workout stats */
	return (
		<StyledGrid item xs={4}>
			<Card variant="outlined">
				<CardContent className={classes.stopwatchCard}>
					<Typography gutterBottom variant="h5" component="h2">
						<IconResistance className={classes.inlineIcon} /> Workout
					</Typography>
					<Container>
						<p>{message}</p>
					</Container>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
