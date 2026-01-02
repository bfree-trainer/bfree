// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useGlobalState } from 'lib/global';
import { createActivityLog, Lap } from 'lib/activity_log';
import { speedUnitConv, UnitConv } from 'lib/units';
import Graph, { SeriesDataPoint, Series } from 'components/Graph';

export const measurementColors = [
	'#ffaeae', // heart_rate
	'#b1e67b', // power
	'#57baeb', // speed
];

function lap2Series(lap: Lap, speedUnit: UnitConv[string]): Series {
	const { startTime } = lap;

	const hrData: SeriesDataPoint[] = lap.trackPoints.map((p) => ({
		x: p.time - startTime,
		y: !isNaN(p.hr) ? p.hr : 0,
	}));
	const powerData: SeriesDataPoint[] = lap.trackPoints.map((p) => ({
		x: p.time - startTime,
		y: !isNaN(p.power) ? p.power : 0,
	}));
	const speedData: SeriesDataPoint[] = lap.trackPoints.map((p) => ({
		x: p.time - startTime,
		y: !isNaN(p.speed) ? speedUnit.convTo(p.speed) : 0,
	}));

	return [
		{
			id: 'HR (BPM)',
			data: hrData,
		},
		{
			id: 'Power [W]',
			data: powerData,
		},
		{
			id: `Speed [${speedUnit.name}]`,
			data: speedData,
		},
	];
}

export default function DataGraph({
	logger,
	type,
	lapId,
	isInteractive,
}: {
	logger: ReturnType<typeof createActivityLog>;
	type: 'full' | 'lap';
	lapId?: number;
	isInteractive?: boolean;
}) {
	const [unitSpeed] = useGlobalState('unitSpeed');
	const speedUnit = speedUnitConv[unitSpeed];
	let series: Series = [];

	if (logger) {
		if (type === 'full') {
			const laps = logger.getLaps();
			if (laps.length !== 0) {
				const fullLap: Lap = {
					trackPoints: [],
					startTime: laps[0].startTime,
					totalTime: laps.reduce((acc: number, cur: Lap) => acc + (cur.totalTime ?? 0), 0),
					distanceMeters: laps.reduce((acc: number, cur: Lap) => acc + (cur.distanceMeters ?? 0), 0),
					maxSpeed: laps.reduce((max: number, cur: Lap) => (max < (cur.maxSpeed ?? 0) ? cur.maxSpeed : 0), 0),
					calories: laps.reduce((acc: number, cur: Lap) => acc + (cur.calories ?? 0), 0),
					avgHR: laps.reduce((acc: number, cur: Lap) => acc + (cur.avgHR ?? 0), 0) / laps.length,
					maxHR: laps.reduce((max: number, cur: Lap) => (max < (cur.maxHR ?? 0) ? cur.maxHR : 0), 0),
					intensity: 'Active',
					triggerMethod: 'Manual',
				};
				for (const lap of laps) {
					fullLap.trackPoints.push(...lap.trackPoints);
				}
				series = lap2Series(fullLap, speedUnit);
			}
		} else if (type === 'lap') {
			const lap = lapId ? logger.getLap(lapId) : logger.getCurrentLap();
			if (lap) {
				series = lap2Series(lap, speedUnit);
			}
		}
	}

	return <Graph series={series} colors={measurementColors} isInteractive={isInteractive} />;
}
