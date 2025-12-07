// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { CscMeasurements } from '../measurements';
import { getGlobalState } from '../global';

export async function startCyclingSpeedAndCadenceMeasurementNotifications(
	server: BluetoothRemoteGATTServer,
	cb: (res: CscMeasurements) => void
) {
	const service = await server.getPrimaryService('cycling_speed_and_cadence');
	const characteristic = await service.getCharacteristic('csc_measurement');
	const { wheelCircumference } = getGlobalState('bike');
	const circumferenceM = wheelCircumference / 1000;

	let prevCumulativeWheelRevolutions = null;
	let prevLastWheelEvent = null;
	let prevCumulativeCrankRevolutions = null;
	let prevLastCrankEvent = null;

	characteristic.addEventListener('characteristicvaluechanged', (event) => {
		// @ts-ignore
		const value = event.target.value;

		const flags = value.getUint8(0, true);
		const wheelRevolutionDataPresent = !!(flags & 0x1);
		const crankRevolutionDataPresent = !!(flags & 0x2);

		let cumulativeWheelRevolutions = null;
		let lastWheelEvent = null;
		let cumulativeCrankRevolutions = null;
		let lastCrankEvent = null;
		let speed = null;
		let cadence = null;

		if (wheelRevolutionDataPresent) {
			cumulativeWheelRevolutions = value.getUint32(1, true);
			lastWheelEvent = value.getUint16(5, true);

			if (prevCumulativeWheelRevolutions !== null && prevLastWheelEvent !== null) {
				const prevRevs = prevCumulativeWheelRevolutions;
				const curRevs = cumulativeWheelRevolutions;
				const deltaRevs = curRevs - prevRevs;

				// @ts-ignore sensorValue is never undefined here
				const curLastWheelEvent = lastWheelEvent;
				const deltaWheelEvents =
					curLastWheelEvent >= prevLastWheelEvent
						? curLastWheelEvent - prevLastWheelEvent
						: 0xffff - prevLastWheelEvent + curLastWheelEvent + 1;

				// 1024 = as per CSCS_SPECv10:
				// > The ‘wheel event time’ is a free-running-count of
				// > 1/1024 second units and it represents the time when the
				// > wheel revolution was detected by the wheel rotation sensor.
				// The final result is m/s
				speed = (circumferenceM * deltaRevs) / (deltaWheelEvents / 1024) || 0;
			}
			prevCumulativeWheelRevolutions = cumulativeWheelRevolutions;
			prevLastWheelEvent = lastWheelEvent;
		}
		if (crankRevolutionDataPresent) {
			cumulativeCrankRevolutions = value.getUint16(wheelRevolutionDataPresent ? 7 : 1, true);
			lastCrankEvent = value.getUint16(wheelRevolutionDataPresent ? 9 : 3, true);

			if (prevLastCrankEvent !== null && prevLastWheelEvent !== null) {
				const prevRevs = prevCumulativeCrankRevolutions;
				const curRevs = cumulativeCrankRevolutions;
				const deltaRevs = curRevs >= prevRevs ? curRevs - prevRevs : 0xffff - prevRevs + curRevs + 1;

				const curLastCrankEvent = lastCrankEvent;
				const deltaLastCrankEvent =
					curLastCrankEvent >= prevLastCrankEvent
						? curLastCrankEvent - prevLastCrankEvent
						: 0xffff - prevLastCrankEvent + curLastCrankEvent + 1;

				cadence = (deltaRevs / deltaLastCrankEvent) * 60 || 0;
			}
			prevCumulativeCrankRevolutions = cumulativeCrankRevolutions;
			prevLastCrankEvent = lastCrankEvent;
		}

		cb({
			ts: Date.now(),
			cumulativeWheelRevolutions,
			lastWheelEvent,
			cumulativeCrankRevolutions,
			lastCrankEvent,
			speed,
			cadence,
		});
	});
	characteristic.startNotifications();

	return characteristic;
}
