// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { TrainerMeasurements } from '../measurements';
import defer from '../defer';

// Supported page requests
type PageNumber = 1 | 2 | 16 | 17 | 21 | 25 | 32 | 48 | 49 | 50 | 51 | 54 | 55 | 71 | 80 | 81;
type PageListener = (pageData: any) => void;

const TACX_FEC_OVER_BLE_SERVICE_UUID = '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e';
const TACX_FEC_CHARACTERISTIC_TX = '6e40fec2-b5a3-f393-e0a9-e50e24dcca9e';
const TACX_FEC_CHARACTERISTIC_RX = '6e40fec3-b5a3-f393-e0a9-e50e24dcca9e';

const ANT_TIMEOUT = 10 * 1000;

function calcChecksum(buf: DataView) {
	let checksum = 0;

	for (let i = 0; i < buf.byteLength - 1; i++) {
		checksum ^= buf.getUint8(i);
	}

	return checksum;
}

function setSendHeader(msg: DataView, len: number) {
	msg.setUint8(0, 0xa4); // sync
	msg.setUint8(1, len); // len
	msg.setUint8(2, 0x4f); // type
	msg.setUint8(3, 0x05); // channel
}

export async function createSmartTrainerController(
	server: BluetoothRemoteGATTServer,
	measurementsCb: (res: TrainerMeasurements) => void
) {
	const service = await server.getPrimaryService(TACX_FEC_OVER_BLE_SERVICE_UUID);
	const txCharacteristic = await service.getCharacteristic(TACX_FEC_CHARACTERISTIC_RX);
	const rxCharacteristic = await service.getCharacteristic(TACX_FEC_CHARACTERISTIC_TX);

	const pageReqQueue: { [k in PageNumber]: ReturnType<typeof defer>[] } = {
		'1': [],
		'2': [],
		'16': [],
		'17': [],
		'21': [],
		'25': [],
		'32': [],
		'48': [],
		'49': [],
		'50': [],
		'51': [],
		'54': [],
		'55': [],
		'71': [],
		'80': [],
		'81': [],
	};
	const pageListeners: { [k in PageNumber]: PageListener[] } = {
		'1': [],
		'2': [],
		'16': [],
		'17': [],
		'21': [],
		'25': [],
		'32': [],
		'48': [],
		'49': [],
		'50': [],
		'51': [],
		'54': [],
		'55': [],
		'71': [],
		'80': [],
		'81': [],
	};

	const deferResponse = (page: PageNumber) => {
		const deferredResponse = defer();

		pageReqQueue[page].push(deferredResponse);

		setTimeout(() => {
			const i = pageReqQueue[page].indexOf(deferredResponse);
			if (i > -1) {
				pageReqQueue[page].splice(i, 1);
				deferredResponse.reject(new Error('Request timed out'));
			}
		}, ANT_TIMEOUT);

		return deferredResponse;
	};
	const addPageListener = (page: PageNumber, cb: PageListener) => {
		pageListeners[`${page}`].push(cb);
	};
	const removePageListener = (page: PageNumber, cb: PageListener) => {
		const pageStr = `${page}`;
		const i = pageListeners[pageStr].indexOf(cb);
		if (i > -1) {
			pageListeners[pageStr].splice(i, 1);
		}
	};
	const dispatchPageEvent = (page: PageNumber, data: any) => {
		const pageStr = `${page}`;
		pageListeners[pageStr].forEach((cb) => {
			cb(data);
		});
	};

	// This is here because we will be receiving many different message types
	// and we need to persist the previous results.
	let prevResult: TrainerMeasurements = {
		ts: Date.now(),
		calStatus: {
			powerCalRequired: false,
			resistanceCalRequired: false,
			userConfigRequired: false,
		},
	};

	const sendBasicResistance = async (value: number) => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		value = Math.round(Math.abs(value) * 2) & 0xff;

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x30); // page
		msg.setUint8(5, 0xff);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, 0xff);
		msg.setUint8(10, 0xff);
		msg.setUint8(11, value);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	const sendTargetPower = async (value: number) => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		value = Math.round(Math.abs(value * 4));

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x31); // page
		msg.setUint8(5, 0xff);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, 0xff);
		msg.setUint8(10, value & 0x00ff);
		msg.setUint8(11, (value & 0xff00) >> 8);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	const sendWindResistance = async (windResistanceCoeff: number, windSpeed: number, draftingFactor: number) => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		windResistanceCoeff *= 100;
		windSpeed += 127;
		draftingFactor *= 100;

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x32); // page
		msg.setUint8(5, 0xff);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, windResistanceCoeff);
		msg.setUint8(10, windSpeed);
		msg.setUint8(11, draftingFactor);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	// Send slope.
	// @param gradeP -200 % to 200%
	// @param rollingResistanceCoeff 0.0 to 0.0127
	const sendSlope = async (gradeP: number, rollingResistanceCoeff: number) => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		gradeP = Math.round((Math.max(-200, Math.min(gradeP, 200)) + 200) * 100);
		const gradeLsb = gradeP & 0x00ff;
		const gradeMsb = (gradeP & 0xff00) >> 8;

		rollingResistanceCoeff = Math.round(Math.max(0, Math.min(rollingResistanceCoeff, 0.0127)) * 20000); // coeff / (5 * 10^(-5))

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x33); // page
		msg.setUint8(5, 0xff);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, gradeLsb);
		msg.setUint8(10, gradeMsb);
		msg.setUint8(11, rollingResistanceCoeff);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	const sendUserConfiguration = async ({
		userWeightKg,
		bikeWeightKg,
		wheelCircumference,
	}: {
		userWeightKg: number;
		bikeWeightKg: number;
		wheelCircumference: number;
	}) => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		userWeightKg = Math.round(userWeightKg * 100) & 0xffff; // Unit 0.01 kg
		bikeWeightKg = Math.round(bikeWeightKg * 0.05) & 0x0fff; // Unit 0.05 kg
		const bikeWheelDiameter = Math.floor((100 * wheelCircumference) / (10 * Math.PI)) & 0xff; // Unit 0.01 m
		// RFE floor or round?
		// RFE Does it always stay around 10 mm this way?
		const wheelOffset = Math.round(wheelCircumference / Math.PI - bikeWheelDiameter * 10) & 0x0f; // mm

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x37); // page
		msg.setUint8(5, userWeightKg & 0xff);
		msg.setUint8(6, (userWeightKg & 0xff00) >> 8); // user weight msb, unit 0.01 kg, invalid = 0xffff
		msg.setUint8(7, 0xff);
		msg.setUint8(8, wheelOffset | ((bikeWeightKg & 0xf) << 4)); // bike weight lsb bits 4-7
		msg.setUint8(9, (0x0ff0 & bikeWeightKg) >> 4); // bike weight msb unit 0.05 kg
		msg.setUint8(10, bikeWheelDiameter);
		msg.setUint8(11, 0x00); // TODO DI2 could set this?

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	// TODO This is probably never really needed
	const sendCalibrationReset = async () => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x01); // page
		msg.setUint8(5, 0xff);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, 0xff);
		msg.setUint8(10, 0xff);
		msg.setUint8(11, 0xff);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	const sendCalibrationReq = async () => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		// Header
		setSendHeader(msg, 0x09);

		const CAL_MODE_SPIN_DOWN = 0x80;
		const CAL_MODE_ZERO_OFFSET = 0x40;
		const calMode = CAL_MODE_ZERO_OFFSET | CAL_MODE_SPIN_DOWN;

		// Payload
		msg.setUint8(4, 0x01); // page
		msg.setUint8(5, calMode);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, 0xff);
		msg.setUint8(10, 0xff);
		msg.setUint8(11, 0xff);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	const sendCalibrationCancel = async () => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x01); // page
		msg.setUint8(5, 0x00);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, 0xff);
		msg.setUint8(10, 0xff);
		msg.setUint8(11, 0xff);

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		await txCharacteristic.writeValue(buf);
	};

	const sendPageReq = async (page: PageNumber) => {
		const buf = new ArrayBuffer(13);
		const msg = new DataView(buf);

		// Header
		setSendHeader(msg, 0x09);

		// Payload
		msg.setUint8(4, 0x46); // page
		msg.setUint8(5, 0xff);
		msg.setUint8(6, 0xff);
		msg.setUint8(7, 0xff);
		msg.setUint8(8, 0xff);
		msg.setUint8(9, 0x80);
		msg.setUint8(10, page);
		msg.setUint8(11, 0x01); // Command type: 0x01 = req page; 0x02 = req ANT-FS session

		// Checksum
		msg.setUint8(12, calcChecksum(msg));

		const deferredResponse = deferResponse(page);
		await txCharacteristic.writeValue(buf);
		return await deferredResponse;
	};

	rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
		// @ts-ignore
		const value = event.target.value;

		const sync = value.getUint8(0);
		if (sync !== 0xa4) {
			console.error('Invalid ANT+ message sync byte', sync);
			return;
		}
		const msgLen = value.getUint8(1);
		const msgId = value.getUint8(2);
		if (value.byteLength < 3 + msgLen + 1) {
			console.error('Invalid ANT+ message size');
			return;
		}

		/*
		 * Verify the checksum.
		 */
		const checksum = value.getUint8(3 + msgLen);
		if (checksum !== calcChecksum(value)) {
			console.error(`Invalid ANT+ message checksum ${checksum}`);
			return;
		}

		const channelNo = value.getUint8(3);
		if (channelNo !== 0x05) {
			console.error(`No idea what to do with channelNo ${channelNo}`);
			return;
		}
		//console.log('tacx', {
		//	msgLen,
		//	msgId,
		//	channelNo,
		//});

		const result = prevResult;

		const offset = 4;
		const pageNumber = value.getUint8(offset);
		//console.log('FEC-C received page', pageNumber);
		let pageData; // This will be sent to listeners and queued reqs
		if (pageNumber === 1) {
			// Calibration request and response
			const calibrationRes = value.getUint8(offset + 1);
			const spinDownCalRes = !!(calibrationRes & 0x80);
			const zeroOffsetCalRes = !!(calibrationRes & 0x40);

			let temperature = value.getUint8(offset + 3); // Celsius
			temperature = temperature === 0xff ? -1 : temperature * 0.5 - 25;

			let zeroOffsetRes = value.getUint8(offset + 4) | (value.getUint8(offset + 5) << 8);
			zeroOffsetRes = zeroOffsetRes === 0xffff ? -1 : zeroOffsetRes;

			let spindownTimeRes = value.getUint8(offset + 6) | (value.getUint8(offset + 7) << 8);
			spindownTimeRes = spindownTimeRes === 0xffff ? -1 : spindownTimeRes;

			pageData = {
				spinDownCalRes,
				zeroOffsetCalRes,
				temperature,
				zeroOffsetRes,
				spindownTimeRes,
			};
		} else if (pageNumber === 2) {
			// Calibration in progress
			// Calibration status
			const calStatus = value.getUint8(offset + 1);
			const spinDownCalStat = !!(calStatus & 0x80);
			const zeroOffsetCalStat = !!(calStatus & 0x40);

			// Calibration condition
			const calCond = value.getUint8(offset + 2);
			const tempCond = (calCond & 0x30) >> 4;
			const speedCond = (calCond & 0xc0) >> 6;

			// Current temperature
			let currentTemp = value.getUint8(offset + 3);
			currentTemp = currentTemp === 0xff ? -1 : currentTemp * 0.5 - 25;

			// Target speed [km/h]
			let targetSpeed = value.getUint8(offset + 4) | (value.getUint8(offset + 5) << 8);
			targetSpeed = targetSpeed === 0xffff ? -1 : targetSpeed * 0.001;

			// Target spin-down time
			let targetSpinDownTime = value.getUint8(offset + 6) | (value.getUint8(offset + 7) << 8);
			targetSpinDownTime = targetSpinDownTime === 0xffff ? -1 : targetSpinDownTime / 1000;

			pageData = {
				spinDownCalStat,
				zeroOffsetCalStat,
				speedCond, // 0 = NA; 1 = too low; 2 = ok
				tempCond, // 0 = NA; 1 = too low; 2 = ok; 3 = too high
				currentTemp,
				targetSpeed, // m/s
				targetSpinDownTime,
			};
		} else if (pageNumber === 16) {
			// General data page
			const equipmentType =
				{
					16: 'General',
					19: 'Treadmill',
					20: 'Elliptical',
					21: 'Stationary bike',
					22: 'Rower',
					23: 'Climber',
					24: 'Nordic Skier',
					25: 'Trainer',
				}[value.getUint8(offset + 1) & 0x1f] || 'Unknown';
			const elapsedTime = value.getUint8(offset + 2) * 0.25; // Unit 0.25 sec; rollover 64 sec
			const accumulatedDistance = value.getUint8(offset + 3); // meters; rollover 255 meters
			const speed = (value.getUint8(offset + 4) | (value.getUint8(offset + 5) << 8)) * 0.001;
			const heartRate = value.getUint8(offset + 6);
			const capabilityBits = value.getUint8(offset + 7);
			const capabilities = {
				hrSource: !!(capabilityBits & 0x3),
				distanceCap: !!(capabilityBits & 0x4),
				speedIsVirtual: !!(capabilityBits & 0x8),
			};

			pageData = {
				equipmentType,
				capabilities,
				heartRate,
				elapsedTime,
				speed,
				accumulatedDistance,
			};

			result.elapsedTime = elapsedTime;
			result.speed = speed;
			result.accumulatedDistance = accumulatedDistance;
			result.heartRate = heartRate;
		} else if (pageNumber === 17) {
			// General settings
			const cycleLen = value.getUint8(offset + 5) * 0.01; // m
			const incline = value.getUint8(offset + 5) | (value.getUint8(offset + 4) << 8);
			const resistanceLevel = value.getUint8(offset + 6) * 0.5;

			pageData = {
				cycleLen,
				incline,
				resistanceLevel,
			};
		} else if (pageNumber == 18) {
			// Metabolic rate
			// TODO Check if TACX has this
		} else if (pageNumber === 25) {
			// Trainer specific page
			const updateEventCount = value.getUint8(offset + 1);
			const instantaneousCadence = value.getUint8(offset + 2);
			const accumulatedPower = value.getUint8(offset + 3) | (value.getUint8(offset + 4) << 8);
			const instantaneousPower = value.getUint8(offset + 5) | ((value.getUint8(offset + 6) & 0x0f) << 8);

			const calBits = (value.getUint8(offset + 6) & 0xf0) >> 4;
			const powerCalRequired = !!(calBits & 0x1);
			const resistanceCalRequired = !!(calBits & 0x2);
			const userConfigRequired = !!(calBits & 0x4);

			const powerLimits = value.getUint8(offset + 7) & 0xf;
			const fecState = value.getUint8(offset + 7) >> 4;

			pageData = {
				updateEventCount,
				instantaneousCadence,
				accumulatedPower,
				instantaneousPower,
				powerLimits, // 0 = at target/not set; 1 = too low power; 2 = too high power; 3 = undetermined
				fecState,
				calStatus: {
					powerCalRequired,
					resistanceCalRequired,
					userConfigRequired,
				},
			};

			result.accumulatedPower = accumulatedPower;
			result.power = instantaneousPower;
			result.cadence = instantaneousCadence;
			result.powerLimits = powerLimits as 0 | 1 | 2 | 3;
			result.calStatus.powerCalRequired = powerCalRequired;
			result.calStatus.resistanceCalRequired = resistanceCalRequired;
			result.calStatus.userConfigRequired = userConfigRequired;
		} else if (pageNumber === 26) {
			// Trainer torque page
			const updateEventCount = value.getUint8(offset + 1);
			const wheelRevolutions = value.getUint8(offset + 2); // Rollover 256
			const wheelAccumulatedPeriod = value.getUint8(offset + 3) | (value.getUint8(offset + 4) << 8);
			const accumulatedTorque = value.getUint8(offset + 5) | (value.getUint8(offset + 6) << 8);
			const fecState = value.getUint8(offset + 7) >> 4;

			pageData = {
				updateEventCount,
				wheelRevolutions,
				wheelAccumulatedPeriod,
				accumulatedTorque,
				fecState,
			};
		} else if (pageNumber === 48) {
			// Basic resistance
			const totalResistance = value.getUint8(offset + 7) * 0.5;

			pageData = {
				totalResistance,
			};
		} else if (pageNumber === 49) {
			// Target power
			const targetPower = (value.getUint8(offset + 6) | (value.getUint8(offset + 7) << 8)) * 0.25;

			pageData = {
				targetPower,
			};
		} else if (pageNumber === 50) {
			// Wind resistance
			const windResistanceCoeff = value.getUint8(offset + 5) * 0.01;
			const windSpeed = value.getUint8(offset + 6) - 127; //km/h
			const draftingFactor = value.getUint8(offset + 7) * 0.01;

			pageData = {
				windResistanceCoeff,
				windSpeed,
				draftingFactor,
			};
		} else if (pageNumber === 51) {
			// Track resistance
			const grade = (value.getUint8(offset + 5) | (value.getUint8(offset + 6) << 8)) * 0.01; // %
			const rollingResistanceCoeff = value.getUint8(offset + 6) * 0.00005; // coeff * 5 * 10^(-5)

			pageData = {
				grade,
				rollingResistanceCoeff,
			};
		} else if (pageNumber === 54) {
			// FE Trainer capabilities
			const maxResistance = value.getUint8(offset + 5) | (value.getUint8(offset + 6) << 8);
			const capabilities = value.getUint8(offset + 7); // TODO

			pageData = {
				maxResistance,
				capabilities,
			};
		} else if (pageNumber === 55) {
			// User configuration
			const userWeightKg = (value.getUint8(offset + 1) | (value.getUint8(offset + 2) << 8)) * 0.01;
			const wheelOffset = (value.getUint8(offset + 4) & 0xf0) >> 4; // mm
			const bikeWeightKg = ((value.getUint8(offset + 4) & 0x0f) | (value.getUint8(offset + 5) << 8)) * 0.05;
			const bikeWheelDiameter = value.getUint8(offset + 6) * 0.01;
			const gearRatio = value.getUint8(offset + 7) * 0.03;

			// TODO Calc the wheel size here already
			pageData = {
				userWeightKg,
				wheelOffset,
				bikeWeightKg,
				bikeWheelDiameter,
				gearRatio,
			};
		} else if (pageNumber === 70) {
			// Request data
		} else if (pageNumber === 71) {
			// Command status
			const lastCommandReceived = value.getUint8(offset + 1);
			const lastCommandSeq = value.getUint8(offset + 2);
			const lastCommandStatus = value.getUint8(offset + 3);
			if (lastCommandReceived === 48) {
				// FE basic resistance
				const setResistanceAck = value.getUint8(offset + 7) / 2;

				pageData = {
					lastCommandSeq,
					lastCommandStatus,
					setResistanceAck,
				};
			} else if (lastCommandReceived === 49) {
				// FE target power
				const targetPowerAck = (value.getUint8(offset + 6) >> 2) | (value.getUint8(offset + 7) << 6);

				pageData = {
					lastCommandSeq,
					lastCommandStatus,
					targetPowerAck,
				};
			} else if (lastCommandReceived === 50) {
				// Wind resistance
				const windResistanceAck = value.getUint8(offset + 5) * 0.01;
				const windSpeedAck = value.getUint8(offset + 6);
				const draftingFactorAck = value.getUint8(offset + 7);

				pageData = {
					lastCommandSeq,
					lastCommandStatus,
					windResistanceAck,
					windSpeedAck,
					draftingFactorAck,
				};
			} else if (lastCommandReceived === 51) {
				// Track resistance
				const setGradeAck = (value.getUint8(5) | (value.getUint8(6) << 8)) * 0.01;
				const setRollingResistanceAck = value.getUint8(7);

				pageData = {
					lastCommandSeq,
					lastCommandStatus,
					setGradeAck,
					setRollingResistanceAck,
				};
			}
		} else if (pageNumber === 80) {
			// Manufacturer ID
			const hwRevision = value.getUint8(offset + 3);
			const manufacturerId = value.getUint8(offset + 4) | (value.getUint8(offset + 5) << 8);
			const modelNo = value.getUint8(offset + 6) | (value.getUint8(offset + 7) << 8);

			pageData = {
				hwRevision,
				manufacturerId,
				modelNo,
			};
		} else if (pageNumber === 81) {
			// Product info
			const swRevisionSupplemental = value.getUint8(offset + 2);
			const swRevisionMain = value.getUint8(offset + 3);
			const serialNumber =
				value.getUint8(offset + 4) |
				(value.getUint8(offset + 5) << 8) |
				(value.getUint8(offset + 6) << 16) |
				(value.getUint8(offset + 7) << 24);

			pageData = {
				swRevisionSupplemental,
				swRevisionMain,
				serialNumber,
			};
		}

		// Dispatch events
		if (pageData) {
			const req = pageReqQueue[`${pageNumber}`].pop();
			if (req) {
				req.resolve(pageData);
			}

			dispatchPageEvent(pageNumber, pageData);
		}

		result.ts = Date.now();

		// We probably shouldn't be mutating a result object but always
		// create a new copy, thus we make a copy here.
		prevResult = JSON.parse(JSON.stringify(result));

		measurementsCb(result);
	});

	return {
		txCharacteristic,
		rxCharacteristic,
		startNotifications: () => rxCharacteristic.startNotifications(),
		sendBasicResistance,
		sendTargetPower,
		sendWindResistance,
		sendSlope,
		sendUserConfiguration,
		sendCalibrationReset,
		sendCalibrationReq,
		sendCalibrationCancel,
		sendPageReq,
		// Events
		addPageListener,
		removePageListener,
	};
}
