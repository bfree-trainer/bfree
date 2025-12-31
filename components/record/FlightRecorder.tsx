// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'react';
import { useGlobalState, getGlobalState, setGlobalState } from 'lib/global';
import { createActivityLog, saveActivityLog } from 'lib/activity_log';
import {
	getCyclingCadenceMeasurement,
	getCyclingPowerMeasurement,
	getCyclingSpeedMeasurement,
	getHeartRateMeasurement,
} from 'lib/measurements';

export default function FlightRecorder({ startTime }: { startTime: number }) {
	const [samplingRate] = useGlobalState('samplingRate');
	const [logger, setLogger] = useGlobalState('currentActivityLog');
	const [bikeParams] = useGlobalState('bike');

	useEffect(() => {
		if (!logger && startTime !== 0) {
			try {
				const l = createActivityLog();
				l.lapSplit(startTime, 'Manual'); // Initial lap
				setGlobalState('elapsedTime', 0);
				setGlobalState('elapsedLapTime', 0);
				setGlobalState('rideDistance', 0);
				setGlobalState('lapDistance', 0);
				setLogger(l);
			} catch (err) {
				// TODO Show an error to the user
				console.error(err);
			}
		}
	}, [startTime]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(
		() => {
			let resetOffset = true;
			let offset: number;

			if (!logger) {
				console.log('Waiting for logger');
				return;
			}

			let wheelRevolutionsOffset: number; // used as an offset for CscMeasurements
			let prevTrainerAccumulatedDistance: number = 0;
			let calculatedDistance: number = 0;
			let altitude: number = 0;
			const intervalId = setInterval(() => {
				try {
					if (getGlobalState('ridePaused') != 0) {
						// The recording is paused.
						resetOffset = true;
						return;
					}
					if (resetOffset) {
						resetOffset = false;
						offset = Date.now();
					}

					const cadence = getCyclingCadenceMeasurement();
					const power = getCyclingPowerMeasurement();
					const speed = getCyclingSpeedMeasurement();
					const heartRate = getHeartRateMeasurement();
					let lapDistance = getGlobalState('lapDistance');
					const { slope } = getGlobalState('control_params');

					if (speed) {
						let distDiff: number;

						if ('cumulativeWheelRevolutions' in speed) {
							// Instead of resetting the sensor, we are keeping track off the
							// initially observed revolutions value and subtract it from
							// the future readings. Indeed, the reset operation might not be
							// even available in many sensors.
							if (wheelRevolutionsOffset === undefined) {
								wheelRevolutionsOffset = speed.cumulativeWheelRevolutions;
							}
							// We calculate the distance inside this if block because the number of
							// cumulative wheel revolutions might not be available at every measurement point.
							//
							// TODO As ble_cscp is state preserving, this is likely happening because we are
							// jumping to another speed sensor source that doesn't have wheelRevs. We should
							// probably support the whatever other ways too or implement revs for all speed
							// sources. (mainly trainer?)
							const prevCalculatedDistance = calculatedDistance;
							calculatedDistance =
								(speed.cumulativeWheelRevolutions - wheelRevolutionsOffset) *
								(bikeParams.wheelCircumference / 1000);
							distDiff = calculatedDistance - prevCalculatedDistance;
						} else if ('accumulatedDistance' in speed) {
							const prevCalculatedDistance = calculatedDistance;

							calculatedDistance += speed.accumulatedDistance - prevTrainerAccumulatedDistance;
							if (prevTrainerAccumulatedDistance > speed.accumulatedDistance) {
								// ANT+ Device Profile - Fitness Equipment - Rev 5.0, 9.1.2
								calculatedDistance += 256;
							}
							prevTrainerAccumulatedDistance = speed.accumulatedDistance;

							distDiff = calculatedDistance - prevCalculatedDistance;
						} else {
							console.log('No distance source');
							distDiff = 0;
						}

						lapDistance += distDiff;

						// Calculate the elevation difference.
						if (slope !== undefined) {
							const elevDiff = (slope / 100) * distDiff;
							altitude += elevDiff;
						}
					}
					const loggedAlt = slope === undefined ? undefined : altitude;

					// TODO Do whatever filtering is required
					const now = Date.now();
					logger.addTrackPoint({
						time: now,
						alt: loggedAlt,
						dist: !speed ? undefined : calculatedDistance || 0,
						speed: !speed ? undefined : speed.speed,
						cadence: !cadence ? undefined : cadence.cadence,
						power: !power ? undefined : power.power, // TODO Power should averaged over x sec or so?
						hr: !heartRate ? undefined : heartRate.heartRate,
					});

					// Update elapsed time
					let elapsedTime = getGlobalState('elapsedTime');
					let elapsedLapTime = getGlobalState('elapsedLapTime');
					elapsedTime += now - offset;
					elapsedLapTime += now - offset;
					offset = now;
					setGlobalState('elapsedTime', elapsedTime);
					setGlobalState('elapsedLapTime', elapsedLapTime);

					setGlobalState('rideDistance', calculatedDistance);
					setGlobalState('lapDistance', lapDistance);

					console.log(
						'tick! ' +
							`ride: ${(elapsedTime / 1000).toFixed(2)} ` +
							`lap: ${(elapsedLapTime / 1000).toFixed(2)} ` +
							`distance: ${calculatedDistance} ` +
							`alt: ${loggedAlt}`
					);
				} catch (err) {
					// TODO Show an error to the user
					console.error('tick failed', err);
				}
			}, samplingRate * 1000);

			// Backup the recording to local storage every minute to avoid
			// data loss.
			const backupIntervalId = setInterval(() => {
				try {
					saveActivityLog(logger);
				} catch (err) {
					console.error('Backup failed', err);
				}
			}, 60e3);

			return () => {
				// Stop recording
				clearInterval(intervalId);
				clearInterval(backupIntervalId);
				// TODO Might not always be manual trigger
				logger.endActivityLog(Date.now(), 'Manual');
				saveActivityLog(logger);
			};
		},
		// Note: 'bikeParams.wheelCircumference' and 'samplingRate' won't change
		//       while we are in the recorder.
		[logger] // eslint-disable-line react-hooks/exhaustive-deps
	);

	return <div></div>;
}
