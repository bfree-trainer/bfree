// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconBike from '@mui/icons-material/DirectionsBike';
import IconCadence from '@mui/icons-material/FlipCameraAndroid';
import IconHeart from '@mui/icons-material/Favorite';
import IconPower from '@mui/icons-material/OfflineBolt';
import IconSpeed from '@mui/icons-material/Speed';
import Title from 'components/Title';
import MyHead from 'components/MyHead';
import { Paired } from 'lib/ble';
import { startCyclingPowerMeasurementNotifications } from 'lib/ble/cpp';
import { startCyclingSpeedAndCadenceMeasurementNotifications } from 'lib/ble/cscp';
import { startHRMNotifications } from 'lib/ble/hrm';
import { createSmartTrainerController } from 'lib/ble/trainer';
import SensorValue from 'components/SensorValue';
import { TrainerCalibrationModal } from 'components/TrainerControl';
import { useGlobalState, getGlobalState } from 'lib/global';
import Ble from 'components/setup/Ble';
import { ActionButton, iconStyle } from 'components/SensorCard';

const PREFIX = 'sensors';
const classes = {
	sensorValue: `${PREFIX}-sensorValue`,
};

const StyledContainer = styled(Container)(({ theme }) => ({
	[`& .${classes.sensorValue}`]: {
		position: 'relative',
		marginBottom: '1em',
		width: '300px',
	},
}));

function Trainer() {
	const sensorName = 'smart_trainer';
	const [sensorValue, setSensorValue] = useGlobalState('smart_trainer');
	const [btDevice] = useGlobalState(`btDevice_smart_trainer`);
	const [smartTrainerControl, setSmartTrainerControl] = useGlobalState('smart_trainer_control');
	const [showSmartTrainerCalibrationModal, setShowSmartTrainerCalibrationModal] = useState(false);

	const connectCb = async (server: BluetoothRemoteGATTServer) => {
		const controller = await createSmartTrainerController(server, setSensorValue);
		await controller.startNotifications();

		const { weight: userWeightKg } = getGlobalState('rider');
		const { weight: bikeWeightKg, wheelCircumference } = getGlobalState('bike');
		await controller.sendUserConfiguration({
			userWeightKg,
			bikeWeightKg,
			wheelCircumference,
		});

		setSmartTrainerControl(controller);
	};
	const disconnectCb = (_btd: Paired) => {
		setSensorValue(null);
		setSmartTrainerControl(null);
	};

	const filters = [
		{
			services: [
				// TACX ANT+ FE-C over BLE
				'6e40fec1-b5a3-f393-e0a9-e50e24dcca9e',
			],
		},
	];

	return (
		<Ble
			icon={<IconBike sx={iconStyle} />}
			title="Smart Trainer"
			globalBtDeviceName={sensorName}
			filter={filters}
			connectCb={connectCb}
			disconnectCb={disconnectCb}
			extraAction={
				<ActionButton
					wait={!smartTrainerControl && !!btDevice}
					disabled={!smartTrainerControl}
					onClick={() => setShowSmartTrainerCalibrationModal(true)}
				>
					Calibrate
				</ActionButton>
			}
		>
			<SensorValue sensorType={sensorName} sensorValue={sensorValue} className={classes.sensorValue} />
			<TrainerCalibrationModal
				open={showSmartTrainerCalibrationModal}
				onClose={() => setShowSmartTrainerCalibrationModal(false)}
			/>
		</Ble>
	);
}

function Power() {
	const sensorName = 'cycling_power';
	const [sensorValue, setSensorValue] = useGlobalState(sensorName);

	const connectCb = async (server: BluetoothRemoteGATTServer) => {
		await startCyclingPowerMeasurementNotifications(server, setSensorValue);
	};
	const disconnectCb = (_btd: Paired) => {
		setSensorValue(null);
	};

	const filters = [{ services: ['cycling_power'] }];

	return (
		<Ble
			icon={<IconPower sx={iconStyle} />}
			title="Power"
			globalBtDeviceName={sensorName}
			filter={filters}
			connectCb={connectCb}
			disconnectCb={disconnectCb}
		>
			<SensorValue sensorType={sensorName} sensorValue={sensorValue} className={classes.sensorValue} />
		</Ble>
	);
}

function SpeedCadence() {
	const sensorName = 'cycling_speed_and_cadence';
	const [sensorValue, setSensorValue] = useGlobalState(sensorName);

	const connectCb = async (server: BluetoothRemoteGATTServer) => {
		await startCyclingSpeedAndCadenceMeasurementNotifications(server, setSensorValue);
	};
	const disconnectCb = (_btd: Paired) => {
		setSensorValue(null);
	};

	const filters = [{ services: ['cycling_speed_and_cadence'] }];

	return (
		<Ble
			icon={<IconCadence sx={iconStyle} />}
			title="Speed &amp; Cadence"
			globalBtDeviceName={sensorName}
			filter={filters}
			connectCb={connectCb}
			disconnectCb={disconnectCb}
		>
			<SensorValue sensorType={sensorName} sensorValue={sensorValue} className={classes.sensorValue} />
		</Ble>
	);
}

function Speed() {
	const sensorName = 'cycling_speed';
	const [sensorValue, setSensorValue] = useGlobalState(sensorName);

	const connectCb = async (server: BluetoothRemoteGATTServer) => {
		await startCyclingSpeedAndCadenceMeasurementNotifications(server, setSensorValue);
	};
	const disconnectCb = (_btd: Paired) => {
		setSensorValue(null);
	};

	const filters = [{ services: ['cycling_speed_and_cadence'] }];

	return (
		<Ble
			icon={<IconSpeed sx={iconStyle} />}
			title="Speed"
			globalBtDeviceName={sensorName}
			filter={filters}
			connectCb={connectCb}
			disconnectCb={disconnectCb}
		>
			<SensorValue sensorType={sensorName} sensorValue={sensorValue} className={classes.sensorValue} />
		</Ble>
	);
}

function Cadence() {
	const sensorName = 'cycling_cadence';
	const [sensorValue, setSensorValue] = useGlobalState(sensorName);

	const connectCb = async (server: BluetoothRemoteGATTServer) => {
		await startCyclingSpeedAndCadenceMeasurementNotifications(server, setSensorValue);
	};
	const disconnectCb = (_btd: Paired) => {
		setSensorValue(null);
	};

	const filters = [{ services: ['cycling_speed_and_cadence'] }];

	return (
		<Ble
			icon={<IconCadence sx={iconStyle} />}
			title="Cadence"
			globalBtDeviceName={sensorName}
			filter={filters}
			connectCb={connectCb}
			disconnectCb={disconnectCb}
		>
			<SensorValue sensorType={sensorName} sensorValue={sensorValue} className={classes.sensorValue} />
		</Ble>
	);
}

function HRM() {
	const sensorName = 'heart_rate';
	const [sensorValue, setSensorValue] = useGlobalState(sensorName);

	const connectCb = async (server: BluetoothRemoteGATTServer) => {
		await startHRMNotifications(server, setSensorValue);
	};
	const disconnectCb = (_btd: Paired) => {
		setSensorValue(null);
	};

	const filters = [{ services: ['heart_rate'] }];

	return (
		<Ble
			icon={<IconHeart sx={iconStyle} />}
			title="HRM"
			globalBtDeviceName={sensorName}
			filter={filters}
			connectCb={connectCb}
			disconnectCb={disconnectCb}
		>
			<SensorValue sensorType={sensorName} sensorValue={sensorValue} className={classes.sensorValue} />
		</Ble>
	);
}

export default function SetupSensors() {
	return (
		<StyledContainer maxWidth="md">
			<MyHead title="Senors" />
			<Box>
				<Title href="/setup">Sensors</Title>
				<p>Connect your smart trainer, HRM, and other sensors using BLE.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<Trainer />
					<Power />
					<SpeedCadence />
					<Speed />
					<Cadence />
					<HRM />
				</Grid>
			</Box>
		</StyledContainer>
	);
}
