// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ReactNode, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import { SensorCard, ActionButton } from 'components/SensorCard';
import { Paired, pairDevice } from 'lib/ble';
import { GlobalState, useGlobalState } from 'lib/global';
import { readBatteryLevel, startBatteryLevelNotifications } from 'lib/ble';

type Severity = 'error' | 'info' | 'success' | 'warning';

type InfoMessage = {
	message: string;
	severity: Severity;
};

function DeviceStatus({ wait, severity, children }: { wait?: boolean; severity: Severity; children: any }) {
	return (
		<CardContent>
			<Alert severity={severity}>{children}</Alert>
		</CardContent>
	);
}

export default function Ble({
	icon,
	title,
	globalBtDeviceName,
	filter,
	optionalServices,
	connectCb,
	disconnectCb,
	extraAction,
	children,
}: {
	icon: ReactNode;
	title: string;
	globalBtDeviceName: keyof GlobalState;
	filter?: Parameters<typeof pairDevice>[0];
	optionalServices?: Parameters<typeof pairDevice>[1];
	connectCb: (server: BluetoothRemoteGATTServer) => Promise<void>;
	disconnectCb: (btd: Paired) => void;
	extraAction?: ReturnType<typeof ActionButton>;
	children?: ReactNode;
}) {
	const pairedWithMessage = (btd: Paired): InfoMessage => ({
		message: btd ? `Paired with\n${btd.device.name}` : 'Not configured',
		severity: 'info',
	});
	const [btAvailable, setBtAvailable] = useState(false);
	const [pairingRequest, setPairingRequest] = useState(false);
	const [isPairing, setIsPairing] = useState(false);
	// @ts-ignore
	const [btDevice, setBtDevice] = useGlobalState(`btDevice_${globalBtDeviceName}`);
	// @ts-ignore
	const [_GloblBatteryLevel, setGloblBatteryLevel] = useGlobalState(`batt_${globalBtDeviceName}`);
	const [batteryLevel, setBatteryLevel] = useState(-1);
	const [info, setInfo] = useState<InfoMessage>(pairedWithMessage(btDevice));

	const unpairDevice = () => {
		if (btDevice) {
			if (btDevice.device.gatt.connected) {
				btDevice.disconnect();
			}
			setBtDevice(null);
			setInfo(pairedWithMessage(null));
			disconnectCb(btDevice);
			setIsPairing(false);
		}
	};

	useEffect(() => {
		navigator.bluetooth
			.getAvailability()
			.then((v) => setBtAvailable(v))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (pairingRequest) {
			setPairingRequest(false);
			setIsPairing(true);
			if (btDevice && btDevice.device.gatt.connected) {
				unpairDevice();
			}

			(async () => {
				try {
					setInfo({ message: 'Requesting BLE Device...', severity: 'info' });

					const newBtDevice = await pairDevice(
						filter || null,
						['battery_service', ...(optionalServices ?? [])],
						async ({ device: _device, server }) => {
							try {
								// Get battery level just once
								try {
									setBatteryLevel(await readBatteryLevel(server));
									startBatteryLevelNotifications(server, setGloblBatteryLevel);
								} catch (err) {
									console.log(`Device ${device.name} doesn't support battery_level`);
								}

								await connectCb(server);
							} catch (err) {
								console.error(err);
								setInfo({ message: `${err}`, severity: 'error' });
							}
						},
						() => {
							// Unpair if we can't reconnect.
							unpairDevice();
						}
					);

					const { device } = newBtDevice;
					console.log(`> Name: ${device.name}\n> Id: ${device.id}\n> Connected: ${device.gatt.connected}`);
					setInfo(pairedWithMessage(newBtDevice));
					setBtDevice(newBtDevice);
				} catch (err) {
					const msg = `${err}`;
					if (msg.startsWith('NotFoundError: User cancelled')) {
						setInfo({ message: 'Pairing cancelled', severity: 'warning' });
					} else {
						setInfo({ message: `${err}`, severity: 'error' });
					}
				} finally {
					setIsPairing(false);
				}
			})();
		}
	}, [pairingRequest]); // eslint-disable-line react-hooks/exhaustive-deps

	const scanDevices = () => {
		setPairingRequest(true);
	};

	return (
		<SensorCard
			icon={icon}
			title={title}
			batteryLevel={batteryLevel}
			actions={
				<CardActions>
					<ActionButton wait={isPairing} disabled={!btAvailable} onClick={scanDevices}>
						Scan
					</ActionButton>
					<ActionButton wait={false} disabled={!btDevice} onClick={unpairDevice}>
						Unpair
					</ActionButton>
					{extraAction || ''}
				</CardActions>
			}
		>
			{children}
			<DeviceStatus wait={isPairing} severity={info.severity}>
				{info.message.split('\n').map((line, i) => (
					<span key={i}>
						{`${line}`}
						<br />
					</span>
				))}
			</DeviceStatus>
		</SensorCard>
	);
}
