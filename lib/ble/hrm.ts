// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { HrmMeasurements } from '../measurements';

export async function startHRMNotifications(server: BluetoothRemoteGATTServer, cb: (res: HrmMeasurements) => void) {
	const service = await server.getPrimaryService('heart_rate');
	const characteristic = await service.getCharacteristic('heart_rate_measurement');

	characteristic.addEventListener('characteristicvaluechanged', (event) => {
		// @ts-ignore
		const value = event.target.value;
		const flags = value.getUint8(0);
		const rate16Bits = flags & 0x1;
		const result: HrmMeasurements = {
			ts: Date.now(),
			heartRate: 0,
		};

		let index = 1;
		if (rate16Bits) {
			result.heartRate = value.getUint16(index, /*littleEndian=*/ true);
			index += 2;
		} else {
			result.heartRate = value.getUint8(index);
			index += 1;
		}
		const contactDetected = flags & 0x2;
		const contactSensorPresent = flags & 0x4;
		if (contactSensorPresent) {
			result.contactDetected = !!contactDetected;
		}
		const energyPresent = flags & 0x8;
		if (energyPresent) {
			result.energyExpended = value.getUint16(index, /*littleEndian=*/ true);
			index += 2;
		}
		const rrIntervalPresent = flags & 0x10;
		if (rrIntervalPresent) {
			let rrIntervals = [];
			for (; index + 1 < value.byteLength; index += 2) {
				rrIntervals.push(value.getUint16(index, /*littleEndian=*/ true));
			}
			result.rrIntervals = rrIntervals;
		}

		cb(result);
	});

	characteristic.startNotifications();

	return characteristic;
}
