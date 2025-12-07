// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { CppMeasurements } from '../measurements';

export async function readCyclingPowerFeature(service) {
	const characteristic = await service.getCharacteristic('cycling_power_feature');

	const value = await characteristic.readValue();
	const flags = value.getUint32(0, true);
	const feature: {
		pedalPowerBalance: boolean;
		accumulatedTorque: boolean;
		wheelRevolutionData: boolean;
		crankRevolutionData: boolean;
		extremeMagnitudes: boolean;
		extremeAngles: boolean;
		deadSpotAngles: boolean /* Top Dead Spot Present and Bottom Dead Spot Present bits of the Cycling Power Measurement characteristic */;
		accumulatedEnergy: boolean;
		offsetCompensationIndicator: boolean;
		sensorMeasurementContext: 'force' | 'torque';
		instantaneousMeasurementDirection: boolean;
		offsetCompensation: boolean;
		cyclingPowerMeasurementContentMasking: boolean;
		multipleSensorLocations: boolean;
		crankLengthAdjustment: boolean;
		chainLengthAdjustment: boolean;
		chainWeightAdjustment: boolean;
		spanLengthAdjustment: boolean;
		factoryCalibration: boolean;
		enhancedOffsetCompensation: boolean;
	} = {
		pedalPowerBalance: !!(flags & 0x001),
		accumulatedTorque: !!(flags & 0x002),
		wheelRevolutionData: !!(flags & 0x004),
		crankRevolutionData: !!(flags & 0x008),
		extremeMagnitudes: !!(flags & 0x010),
		extremeAngles: !!(flags & 0x020),
		deadSpotAngles: !!(flags & 0x040),
		accumulatedEnergy: !!(flags & 0x080),
		offsetCompensationIndicator: !!(flags & 0x100),
		sensorMeasurementContext: !(flags & 0x10000) ? 'force' : 'torque',
		instantaneousMeasurementDirection: !!(flags & 0x20000),
		offsetCompensation: false, // TODO Where is this bit???
		cyclingPowerMeasurementContentMasking: false, // TODO Where is this bit???
		multipleSensorLocations: false, // TODO Where is this bit???
		crankLengthAdjustment: false, // TODO Where is this bit???
		chainLengthAdjustment: false, // TODO Where is this bit???
		chainWeightAdjustment: false, // TODO Where is this bit???
		spanLengthAdjustment: false, // TODO Where is this bit???
		factoryCalibration: false, // TODO Where is this bit???
		enhancedOffsetCompensation: false, // TODO Where is this bit???
	};

	return feature;
}

export async function startCyclingPowerMeasurementNotifications(
	server: BluetoothRemoteGATTServer,
	cb: (res: CppMeasurements) => void
) {
	const service = await server.getPrimaryService('cycling_power');
	const feature = await readCyclingPowerFeature(service);

	let prevRevs = null;
	let prevLastWheelEvent = null;

	const characteristic = await service.getCharacteristic('cycling_power_measurement');
	characteristic.addEventListener('characteristicvaluechanged', (event) => {
		// @ts-ignore
		const value = event.target.value;

		const flags = value.getUint16(0, true);
		const wheelRevolutionDataPresent = !!(flags & 0x10) && feature.wheelRevolutionData;
		const crankRevolutionDataPresent = !!(flags & 0x20) && feature.crankRevolutionData;

		// This field is mandatory and in the first position
		const instantaneousPower = value.getUint16(2, true);

		let cumulativeWheelRevolutions = null;
		let lastWheelEvent = null;
		let instantaneousSpeed = null;

		if (wheelRevolutionDataPresent) {
			// The field index may change if there are other fields present.
			// See CPS_v1.1 3.2
			// @ts-ignore TS doesn't like number + bool
			const iWheelRevolutionDataFieldPair = 4 + feature.pedalPowerBalance + feature.accumulatedTorque;

			cumulativeWheelRevolutions = value.getUint32(iWheelRevolutionDataFieldPair, true);
			lastWheelEvent = value.getUint16(iWheelRevolutionDataFieldPair + 4, true);

			if (prevRevs !== null && prevLastWheelEvent !== null) {
				const curRevs = cumulativeWheelRevolutions;
				const deltaRevs = curRevs - prevRevs;

				const curLastWheelEvent = lastWheelEvent;
				const deltaWheelEvents =
					curLastWheelEvent >= prevLastWheelEvent
						? curLastWheelEvent - prevLastWheelEvent
						: 0xffff - prevLastWheelEvent + curLastWheelEvent + 1;

				// TODO This should be configurable!
				// mm => m
				const circumferenceM = 2097 / 1000;
				// 2048 = as per CPS_v1.1:
				// > The ‘wheel event time’ is a free-running-count of
				// > 1/2048 second units and it represents the time when the wheel
				// > revolution was detected by the wheel rotation sensor.
				// The final result is m/s
				instantaneousSpeed = (circumferenceM * deltaRevs) / (deltaWheelEvents / 2048) || 0;
			}
			prevRevs = cumulativeWheelRevolutions;
			prevLastWheelEvent = lastWheelEvent;
		}

		cb({
			ts: Date.now(), // ms
			cumulativeWheelRevolutions: cumulativeWheelRevolutions !== null ? cumulativeWheelRevolutions : prevRevs,
			lastWheelEvent: lastWheelEvent !== null ? lastWheelEvent : prevLastWheelEvent,
			power: instantaneousPower, // Watts
			speed: instantaneousSpeed, // m/s
		});
	});
	characteristic.startNotifications();

	return characteristic;
}
