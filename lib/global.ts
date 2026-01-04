// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createGlobalState } from 'react-hooks-global-state';
import { BtDevice } from './ble';
import { createActivityLog } from './activity_log';
import { CppMeasurements, CscMeasurements, HrmMeasurements, TrainerMeasurements } from './measurements';
import { createSmartTrainerController } from 'lib/ble/trainer';

export type SensorType =
	| 'cycling_cadence'
	| 'cycling_power'
	| 'cycling_speed'
	| 'cycling_speed_and_cadence'
	| 'heart_rate'
	| 'smart_trainer';

export type SensorSourceType = {
	id: SensorType;
	name: string;
};

export type Rider = {
	weight: number;
	ftp: number;
	heartRate: {
		rest: number;
		max: number;
	};
};

// All the control params that we need to know globally for logging.
export type ControlParams = {
	slope?: number;
};

export const sensorNames: { [k in SensorType]: string } = {
	cycling_cadence: 'cadence sensor',
	cycling_power: 'power sensor',
	cycling_speed: 'speed sensor',
	cycling_speed_and_cadence: 'speed and cadence sensor',
	heart_rate: 'heart rate sensor',
	smart_trainer: 'smart trainer',
};

export const cadenceSourceTypes: SensorSourceType[] = [
	{
		id: 'cycling_cadence',
		name: sensorNames['cycling_cadence'],
	},
	{
		id: 'cycling_speed_and_cadence',
		name: sensorNames['cycling_speed_and_cadence'],
	},
	{
		id: 'cycling_power',
		name: sensorNames['cycling_power'],
	},
	{
		id: 'smart_trainer',
		name: 'trainer',
	},
];

export const speedSourceTypes: SensorSourceType[] = [
	{
		id: 'cycling_power',
		name: sensorNames['cycling_power'],
	},
	{
		id: 'cycling_speed',
		name: sensorNames['cycling_speed'],
	},
	{
		id: 'cycling_speed_and_cadence',
		name: sensorNames['cycling_speed_and_cadence'],
	},
	{
		id: 'smart_trainer',
		name: 'trainer',
	},
];

export const powerSourceTypes: SensorSourceType[] = [
	{
		id: 'cycling_power',
		name: sensorNames['cycling_power'],
	},
	{
		id: 'smart_trainer',
		name: 'trainer',
	},
];

export type GlobalState = {
	// Config
	samplingRate: number;
	cadenceSources: SensorSourceType[];
	speedSources: SensorSourceType[];
	powerSources: SensorSourceType[];
	unitDistance: 'km' | 'm' | 'mi';
	unitSpeed: 'kmph' | 'mph';
	rider: Rider;
	bike: {
		wheelCircumference: number;
		weight: number;
		type: 'atb' | 'commuter' | 'road' | 'racing';
	};
	lapResetsAgg: boolean;
	// Sensors
	btDevice_cycling_cadence: null | BtDevice;
	btDevice_cycling_power: null | BtDevice;
	btDevice_cycling_speed: null | BtDevice;
	btDevice_cycling_speed_and_cadence: null | BtDevice;
	btDevice_heart_rate: null | BtDevice;
	btDevice_smart_trainer: null | BtDevice;
	// Battery Levels
	batt_cycling_cadence: number;
	batt_cycling_power: number;
	batt_cycling_speed: number;
	batt_cycling_speed_and_cadence: number;
	batt_heart_rate: number;
	batt_smart_trainer: number;
	// Measurements
	cycling_cadence: null | CscMeasurements;
	cycling_power: null | CppMeasurements;
	cycling_speed: null | CscMeasurements;
	cycling_speed_and_cadence: null | CscMeasurements;
	heart_rate: null | HrmMeasurements;
	smart_trainer: null | TrainerMeasurements;
	// Control
	control_params: ControlParams;
	smart_trainer_control: any; // TODO This breaks typing of the whole global null | ReturnType<typeof createSmartTrainerController>;
	// Recording state
	currentActivityLog: null | ReturnType<typeof createActivityLog>;
	ridePaused: number; // -1 = not started; 0 = not paused; anything else is a timestamp
	elapsedTime: number;
	elapsedLapTime: number;
	rideDistance: number;
	lapDistance: number;
};

const LOCAL_STORAGE_KEY = 'settings';
const initialState: GlobalState = {
	// Config
	samplingRate: 1, // Hz
	cadenceSources: [],
	speedSources: [],
	powerSources: [],
	unitDistance: 'km',
	unitSpeed: 'kmph',
	rider: {
		weight: 70,
		ftp: 200,
		heartRate: {
			rest: 50,
			max: 200,
		},
	},
	bike: {
		wheelCircumference: 2097, // mm
		weight: 10, // kg
		type: 'road',
	},
	lapResetsAgg: false,
	// Sensors
	btDevice_cycling_cadence: null,
	btDevice_cycling_power: null,
	btDevice_cycling_speed: null,
	btDevice_cycling_speed_and_cadence: null,
	btDevice_heart_rate: null,
	btDevice_smart_trainer: null,
	// Battery Levels
	batt_cycling_cadence: -1,
	batt_cycling_power: -1,
	batt_cycling_speed: -1,
	batt_cycling_speed_and_cadence: -1,
	batt_heart_rate: -1,
	batt_smart_trainer: -1,
	// Measurements
	cycling_cadence: null,
	cycling_power: null,
	cycling_speed: null,
	cycling_speed_and_cadence: null,
	heart_rate: null,
	smart_trainer: null,
	// Control
	control_params: {},
	smart_trainer_control: null,
	// Recording state
	currentActivityLog: null,
	ridePaused: -1,
	elapsedTime: 0,
	elapsedLapTime: 0,
	rideDistance: 0,
	lapDistance: 0,
	// Load config from local storage
	...(typeof window === 'undefined' ? {} : JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY))),
};

const { useGlobalState: _useGlobalState, getGlobalState, setGlobalState } = createGlobalState(initialState);

type ConfigKey =
	| 'samplingRate'
	| 'cadenceSources'
	| 'speedSources'
	| 'powerSources'
	| 'unitDistance'
	| 'unitSpeed'
	| 'rider'
	| 'bike'
	| 'lapResetsAgg';

function useGlobalState(key: keyof GlobalState) {
	const [value, setValue] = _useGlobalState(key);

	const setAndSaveValue = (value: Parameters<typeof setValue>[0]) => {
		setValue(value);

		// Defer saving to not disturb the render loop.
		setTimeout(() => {
			saveConfig();
		}, 0);
	};

	return [value, setAndSaveValue] as const;
}

function saveConfig() {
	const config: { [k in ConfigKey]: any } = {
		samplingRate: getGlobalState('samplingRate'),
		cadenceSources: getGlobalState('cadenceSources'),
		speedSources: getGlobalState('speedSources'),
		powerSources: getGlobalState('powerSources'),
		unitDistance: getGlobalState('unitDistance'),
		unitSpeed: getGlobalState('unitSpeed'),
		rider: getGlobalState('rider'),
		bike: getGlobalState('bike'),
		lapResetsAgg: getGlobalState('lapResetsAgg'),
	};

	localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
}

export { useGlobalState, getGlobalState, setGlobalState, saveConfig };
