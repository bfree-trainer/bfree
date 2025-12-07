// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

export type TrackPoint = {
	time: number;
	position?: {
		lat: number;
		lon: number;
	}; // Used for map courses
	alt?: number; // Altitude in meters
	dist?: number; // Distance in meters
	speed?: number; // Speed in m/s
	cadence?: number;
	power?: number;
	hr?: number;
};
export type LapTriggerMethod = 'Manual' | 'Distance' | 'Location' | 'Time' | 'HeartRate';
export type Intensity = 'Active' | 'Resting';
export type Lap = {
	trackPoints: TrackPoint[];
	startTime: number;
	totalTime: number; // sec
	distanceMeters?: number;
	maxSpeed?: number;
	calories?: number;
	avgHR?: number; // Heart rate BPM
	maxHR?: number; // Heart rate BPM
	intensity: Intensity;
	cadence?: number;
	triggerMethod?: LapTriggerMethod;
};

const PRODUCT_NAME = 'Bfree App';
const UNIT_ID = 0;
const PRODUCT_ID = 0;
const VERSION = [0, 1];
const BUILD = [0, 0];
const LANG_ID = 'en';
const PART_NUMBER = '000-00000-00';
const tcxHeader =
	'<?xml version="1.0" encoding="utf-8"?>\n<TrainingCenterDatabase xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd" xmlns:ns5="http://www.garmin.com/xmlschemas/ActivityGoals/v1" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:ns2="http://www.garmin.com/xmlschemas/UserProfile/v2" xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns4="http://www.garmin.com/xmlschemas/ProfileExtension/v1" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n<Activities><Activity Sport="Biking">\n';
const createNote = (text: string) => `<Notes>${text}</Notes>\n`;
const createTcxFooter = (name: string) =>
	`<Training VirtualPartner="false"><Plan Type="Course" IntervalWorkout="false"><Name>${name}</Name></Plan></Training>\n<Creator xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Device_t"><Name>${PRODUCT_NAME}</Name><UnitId>${UNIT_ID}</UnitId><ProductID>${PRODUCT_ID}</ProductID><Version><VersionMajor>${VERSION[0]}</VersionMajor><VersionMinor>${VERSION[1]}</VersionMinor><BuildMajor>${BUILD[0]}</BuildMajor><BuildMinor>${BUILD[1]}</BuildMinor></Version></Creator>\n</Activity></Activities>\n<Author xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Application_t"><Name>${PRODUCT_NAME}</Name><Build><Version><VersionMajor>${VERSION[0]}</VersionMajor><VersionMinor>${VERSION[1]}</VersionMinor><BuildMajor>${BUILD[0]}</BuildMajor><BuildMinor>${BUILD[1]}</BuildMinor></Version></Build><LangID>${LANG_ID}</LangID><PartNumber>${PART_NUMBER}</PartNumber></Author>\n</TrainingCenterDatabase>\n`;

const convTs = (ts: number) => new Date(ts).toISOString();

export function createActivityLog() {
	let name: string = '';
	let notes: string = '';
	let avatar: string = 'R';
	const laps: Lap[] = [];

	const calcLapStats = (lap: Lap, time: number, triggerMethod: LapTriggerMethod) => {
		const { trackPoints } = lap;

		lap.totalTime = time - lap.startTime;
		lap.triggerMethod = triggerMethod;

		const { maxSpeed, avgHR, maxHR } = trackPoints.reduce<any>(
			(acc, cur: TrackPoint, i, arr) => {
				if (acc.maxSpeed < cur.speed) {
					acc.maxSpeed = cur.speed;
				}
				if (acc.maxHR < cur.hr) {
					acc.maxHR = cur.hr;
				}

				acc.avgHR += cur.hr;
				if (i === arr.length - 1) {
					acc.avgHR /= arr.length;
				}

				return acc;
			},
			{
				maxSpeed: null,
				avgHR: null,
				maxHR: null,
			}
		);

		if (maxSpeed !== null) {
			lap.maxSpeed = maxSpeed;
		}
		if (avgHR !== null) {
			lap.avgHR = avgHR;
		}
		if (maxHR !== null) {
			lap.maxHR = maxHR;
		}

		lap.distanceMeters = trackPoints.length > 0 ? trackPoints[trackPoints.length - 1].dist || 0 : 0;
		lap.calories = 0; // TODO not supported yet.
	};

	return {
		importJson: (json: string) => {
			const parsed = JSON.parse(json);

			name = parsed.name || '';
			notes = parsed.notes || '';
			avatar = parsed.avatar || 'R';

			laps.length = 0;
			for (const lap of parsed.laps) {
				laps.push(lap);
			}

			// TODO Attempt to recover incomplete log e.g. summaries missing
		},
		setName: (s: string) => (name = s || ''),
		getName: () => name,
		setNotes: (s: string) => (notes = s || ''),
		getNotes: () => notes,
		setAvatar: (s: string) => (avatar = s || 'R'),
		getAvatar: () => avatar,
		getLapStartTime: (lapIndex?: number): number => {
			const lap = typeof lapIndex === 'number' ? laps[lapIndex] : laps[laps.length - 1];

			if (!lap) {
				return NaN;
			}

			return lap.startTime;
		},
		getStartTime: (): number => {
			const lap = laps[0];

			if (!lap) {
				return null;
			}

			return lap.startTime;
		},
		getStartTimeISO: (): string | null => {
			const lap = laps[0];

			if (!lap) {
				return null;
			}

			return new Date(lap.startTime).toISOString();
		},
		getCurrentLap: (): undefined | Lap => {
			return laps[laps.length - 1];
		},
		lapSplit: (time: number, triggerMethod: LapTriggerMethod, intensity?: Intensity) => {
			if (laps.length > 0) {
				calcLapStats(laps[laps.length - 1], time, triggerMethod);
			}

			laps.push({
				trackPoints: [],
				startTime: time,
				totalTime: 0, // placeholder
				intensity: intensity || 'Active',
			});
		},
		addTrackPoint: (trackPoint: TrackPoint) => {
			laps[laps.length - 1].trackPoints.push(trackPoint);
		},
		endActivityLog: (time: number, triggerMethod: LapTriggerMethod) => {
			if (laps.length > 0) {
				calcLapStats(laps[laps.length - 1], time, triggerMethod);
			}
		},
		tcx: (outputCb: (line: string) => void) => {
			outputCb(tcxHeader);
			outputCb(`<Id>${convTs(laps[0].trackPoints[0].time)}</Id>\n`);
			laps.forEach((lap) => {
				outputCb(`<Lap StartTime="${convTs(lap.startTime)}">\n`);
				outputCb(`<TotalTimeSeconds>${lap.totalTime / 1000}</TotalTimeSeconds>\n`);
				outputCb(`<DistanceMeters>${lap.distanceMeters || 0}</DistanceMeters>\n`);
				outputCb(`<MaximumSpeed>${lap.maxSpeed || 0}</MaximumSpeed>\n`);
				if (typeof lap.calories === 'number') outputCb(`<Calories>${lap.calories}</Calories>\n`);
				if (typeof lap.avgHR === 'number')
					outputCb(`<AverageHeartRateBpm><Value>${lap.avgHR.toFixed(0)}</Value></AverageHeartRateBpm>\n`);
				if (typeof lap.maxHR === 'number')
					outputCb(`<MaximumHeartRateBpm><Value>${lap.maxHR.toFixed(0)}</Value></MaximumHeartRateBpm>\n`);
				outputCb(`<Intensity>${lap.intensity}</Intensity>\n`);
				if (typeof lap.cadence === 'number') outputCb(`<Cadence>${lap.cadence}</Cadence>\n`);
				outputCb(`<TriggerMethod>${lap.triggerMethod || 'Manual'}</TriggerMethod>\n`);

				outputCb('<Track>\n');
				lap.trackPoints.forEach((point) => {
					outputCb(`<Trackpoint><Time>${convTs(point.time)}</Time>\n`);
					if (point.position)
						outputCb(
							`<Position><LatitudeDegrees>${point.position.lat}</LatitudeDegrees><LongitudeDegrees>${point.position.lon}</LongitudeDegrees></Position>\n`
						);
					if (typeof point.alt === 'number')
						outputCb(`<AltitudeMeters>${point.alt.toFixed(3)}</AltitudeMeters>\n`);
					if (typeof point.dist === 'number')
						outputCb(`<DistanceMeters>${point.dist.toFixed(1)}</DistanceMeters>\n`);
					if (typeof point.hr === 'number')
						outputCb(`<HeartRateBpm><Value>${point.hr.toFixed(0)}</Value></HeartRateBpm>\n`);
					if (typeof point.cadence === 'number') outputCb(`<Cadence>${point.cadence.toFixed(0)}</Cadence>\n`);
					if (typeof point.speed === 'number' || typeof point.power === 'number') {
						outputCb(`<Extensions><ns2:TPX>\n`);
						if (typeof point.speed === 'number') outputCb(`<ns2:Speed>${point.speed}</ns2:Speed>\n`);
						if (typeof point.power === 'number') outputCb(`<ns2:Watts>${point.power}</ns2:Watts>\n`);
						outputCb(`</ns2:TPX></Extensions>\n`);
					}
					outputCb(`</Trackpoint>\n`);
				});
				outputCb('</Track>\n');
				outputCb('</Lap>\n');
			});
			if (notes && notes.length > 0) {
				outputCb(createNote(notes));
			}
			outputCb(createTcxFooter(name));
		},
		json: () => JSON.stringify({ name, notes, avatar, laps }),
	};
}

export function saveActivityLog(logger: ReturnType<typeof createActivityLog>) {
	const date = logger.getStartTimeISO();

	if (!date) {
		throw new Error('Save failed');
	}

	localStorage.setItem(`activity_log:${date}`, logger.json());
}

export function getActivityLogs(): {
	id: string;
	ts: number;
	date: string;
	logger: ReturnType<typeof createActivityLog>;
}[] {
	const arr: ReturnType<typeof getActivityLogs> = [];

	if (typeof window === 'undefined') {
		return [];
	}

	for (let i in localStorage) {
		if (i.startsWith('activity_log:')) {
			const logger = createActivityLog();
			logger.importJson(localStorage[i]);

			const startTime = logger.getStartTime();
			const date = new Date(startTime);

			arr.push({
				id: i,
				ts: startTime,
				date: date.toLocaleDateString([navigator.languages[0], 'en-US'], {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				}),
				logger: logger,
			});
		}
	}

	return arr.sort((a, b) => b.ts - a.ts);
}

export function deleteActivityLog(id: string) {
	if (!id.startsWith('activity_log:')) {
		throw new Error('The given id is not an activity log id');
	}

	localStorage.removeItem(id);
}
