// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

export type BluetoothServiceType =
	| 'cycling_power'
	| 'cycling_speed_and_cadence'
	| 'heart_rate'
	| '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'; // TACX ANT+ FE-C over BLE

export interface BtDevice {
	device: BluetoothDevice;
	server: BluetoothRemoteGATTServer;
}

export type Paired = Awaited<ReturnType<typeof pairDevice>>;

async function connect(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
	try {
		const server = await exponentialBackoff(
			3 /* max retries */,
			2 /* seconds delay */,
			async (): Promise<BluetoothRemoteGATTServer> => {
				time(`Connecting to Bluetooth Device (${device.name})...`);
				return await device.gatt.connect();
			}
		);

		console.log(`Bluetooth Device connected (${device.name}).`);
		return server;
	} catch (err) {
		throw err;
	}
}

/*
 * @param connectCb is called on the initial connect as well as on reconnects. This allows restarting the notifications.
 */
export async function pairDevice(
	filters: any | null,
	optionalServices: string[] | null,
	connectCb: (dev: BtDevice) => Promise<void>,
	onDisconnectedCb: () => void
) {
	const options = {
		acceptAllDevices: !filters,
		filters: filters ?? undefined,
		optionalServices,
	};

	const device = await navigator.bluetooth.requestDevice(options);
	const onDisconnected = (e) => {
		console.log(`> Bluetooth Device "${e.currentTarget.gatt.device.name}" disconnected`);
		connect(device)
			.then(async (server) => {
				const btDevice = {
					device,
					server,
				};

				await connectCb(btDevice);
			})
			.catch((err) => {
				console.error(`> Bluetooth Device "${device.name}" reconnect failed: `, err);
				onDisconnectedCb();
			});
	};

	device.addEventListener('gattserverdisconnected', onDisconnected);
	let server: BluetoothRemoteGATTServer | null;
	try {
		server = await connect(device);
	} catch (err) {
		console.error('> Bluetooth Device connect failed');
		server = null;
	}
	connectCb({
		device,
		server,
	});

	return {
		device,
		disconnect: () => {
			console.log(`> Disconnecting ${device.name}`);
			device.removeEventListener('gattserverdisconnected', onDisconnected);
			device.gatt.disconnect();
		},
	};
}

export async function readBatteryLevel(server: BluetoothRemoteGATTServer) {
	const batteryService = await server.getPrimaryService('battery_service');
	const characteristic = await batteryService.getCharacteristic('battery_level');

	const value = await characteristic.readValue();
	return value.getUint8(0);
}

export async function startBatteryLevelNotifications(server: BluetoothRemoteGATTServer, cb: (level: number) => void) {
	const service = await server.getPrimaryService('battery_service');
	const characteristic = await service.getCharacteristic('battery_level');

	characteristic.addEventListener('characteristicvaluechanged', (event) => {
		// @ts-ignore value does exist in event.target
		cb(event.target.value.getUint8(0));
	});

	await characteristic.readValue();
	characteristic.startNotifications();

	return characteristic;
}

// RFE is this ever needed? We can just unpair and throwaway everything.
export async function stopNotifications(characteristic) {
	characteristic.stopNotifications();
}

async function exponentialBackoff<T>(max: number, delay: number, toTry: () => Promise<T>) {
	return new Promise<ReturnType<typeof toTry>>((resolve, reject) =>
		_exponentialBackoff(max, delay, toTry, resolve, reject)
	);
}

async function _exponentialBackoff(max: number, delay: number, toTry, success, fail) {
	try {
		success(await toTry());
	} catch (error) {
		if (max === 0) {
			return fail(error);
		}
		time('Retrying in ' + delay + 's... (' + max + ' tries left)');
		setTimeout(function () {
			_exponentialBackoff(--max, delay * 2, toTry, success, fail);
		}, delay * 1000);
	}
}

function time(text: string) {
	console.log(`[${new Date().toJSON().substr(11, 8)}]${text}`);
}
