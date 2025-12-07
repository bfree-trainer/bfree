// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';
import { speedUnitConv, distanceUnitConv } from 'lib/units';
import createWorkoutRunner, { RunnerResponse } from 'lib/workout_runner';
import Graph, { Series } from './record/Graph';
import { useGlobalState } from 'lib/global';
import MyModal from './MyModal';

const graphColors = [
	'#b1e67b', // load resistance
];

function getModalStyle() {
	const top = 50;
	const left = 50;

	return {
		top: `${top}%`,
		left: `${left}%`,
		transform: `translate(-${top}%, -${left}%)`,
	};
}

function PreviewParams({
	onChange,
}: {
	onChange: (o: { endTime: number; endDistance: number; speed: number }) => void;
}) {
	const speedUnit = speedUnitConv[useGlobalState('unitSpeed')[0]];
	const distanceUnit = distanceUnitConv[useGlobalState('unitDistance')[0]];
	const [endTime, setEndTime] = useState<number>(0);
	const [endDistance, setEndDistance] = useState<number>(0);
	const [speed, setSpeed] = useState<number>(0);
	const [prev, setPrev] = useState<string>();

	const propagateChange = () => {
		onChange({
			endTime: endTime * 60,
			endDistance: distanceUnit.convToBase(endDistance),
			speed: speedUnit.convToBase(speed),
		});
	};

	const handleEndTimeChange = (e) => {
		const time: number = Number(e.target.value);

		setEndTime(time);
		if (prev === 'distance') {
			setSpeed(speedUnit.convTo(distanceUnit.convToBase(endDistance) / (time * 60)));
		} else if (prev === 'speed') {
			setEndDistance(distanceUnit.convTo(speedUnit.convToBase(speed) * (time * 60)));
		}

		propagateChange();
	};

	const handleEndDistanceChange = (e) => {
		const distance: number = Number(e.target.value);

		setEndDistance(distance);
		if (prev === 'time') {
			setSpeed(speedUnit.convTo(distanceUnit.convToBase(distance) / (endTime * 60)));
		} else if (prev === 'speed') {
			setEndTime(distanceUnit.convToBase(distance) / speedUnit.convToBase(speed) / 60);
		}

		propagateChange();
	};

	const handleSpeedChange = (e) => {
		const newSpeed: number = Number(e.target.value);

		setSpeed(newSpeed);
		if (prev === 'time') {
			setEndDistance(distanceUnit.convTo(speedUnit.convToBase(newSpeed) * (endTime * 60)));
		} else if (prev === 'distance') {
			setEndTime(distanceUnit.convToBase(endDistance) / speedUnit.convToBase(newSpeed) / 60);
		}

		propagateChange();
	};

	return (
		<form noValidate autoComplete="off">
			<TextField
				value={endTime.toFixed(2)}
				onChange={handleEndTimeChange}
				onBlur={() => setPrev('time')}
				id="outlined-basic"
				label="End Time [min]"
				variant="outlined"
			/>
			<TextField
				value={endDistance.toFixed(2)}
				onChange={handleEndDistanceChange}
				onBlur={() => setPrev('distance')}
				id="outlined-basic"
				label={`End Distance [${distanceUnit.name}]`}
				variant="outlined"
			/>
			<TextField
				value={speed.toFixed(2)}
				onChange={handleSpeedChange}
				onBlur={() => setPrev('speed')}
				id="outlined-basic"
				label={`Speed [${speedUnit.name}]`}
				variant="outlined"
			/>
		</form>
	);
}

export default function WorkoutPreviewModal({ code, open, onClose }) {
	const [params, setParams] = useState({ endTime: 0, endDistance: 0, speed: 0 });
	const [series, setSeries] = useState([]);

	const handleClose = () => {
		onClose();
	};

	useEffect(() => {
		let runner: ReturnType<typeof createWorkoutRunner>;

		if (open && typeof code === 'string') {
			console.log('Creating a worker');
			const newSeries: Series = [
				{
					id: 'load',
					data: [
						{
							x: -0.1,
							y: 0,
						},
					],
				},
			];

			let tim: ReturnType<typeof setTimeout>;
			new Promise<void>((resolve, reject) => {
				tim = setTimeout(() => {
					if (runner) {
						runner.terminate();
						runner = null;
					}
					reject(new Error('Simulation timed out'));
				}, 20000);

				// @ts-ignore
				runner = createWorkoutRunner(code);

				runner.onMessage((msg: RunnerResponse) => {
					newSeries[0].data.push({
						x: msg.time,
						y: msg.basicLoad ?? msg.power ?? msg.slope,
					});

					if (msg.time >= params.endTime * 1000) {
						resolve();
					}
				});

				const endTime = Number(params.endTime) * 1000;
				if (endTime <= 0 || endTime > 86400000) {
					return resolve();
				}

				// TODO Allow iterating over distance
				const step = endTime / 50;
				for (let time = 0; time <= endTime; time += step) {
					runner.sendMessage({
						time: time,
						distance: params.speed * time,
						speed: params.speed,
						cadence: 50, // TODO Could be a param
						power: 200, // TODO Could be p param
						heartRate: 120, // TODO Could be a param
					});
				}
			})
				.then(() => {
					if (tim) {
						clearTimeout(tim);
					}
					if (runner) {
						runner.terminate();
						runner = null;
					}
					console.log('Simulation completed');
					setSeries(newSeries);
				})
				.catch(console.error);
		}

		return () => {
			if (runner) {
				console.log('Terminating the worker');
				runner.terminate();
			}
		};
	}, [open, code, params]);

	return (
		<MyModal
			title="Workout Preview"
			description="Adjust the parameters below to see how they affect to the workout."
			open={open}
			onClose={handleClose}
		>
			<PreviewParams onChange={setParams} />
			<Graph
				series={series}
				colors={graphColors}
				curve="stepAfter"
				enableArea={true}
				enableLegends={true}
				isInteractive={true}
			/>
		</MyModal>
	);
}
