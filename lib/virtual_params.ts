// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { GlobalState } from './global';

export const rollingResistanceCoeff = {
	wood: 0.001, // Wooden track
	concrete: 0.002,
	asphalt: 0.004, // Asphalt road
	rough: 0.008, // Rough road
};

// Unit m^2
export const stdBikeFrontalArea: { [k in GlobalState['bike']['type']]: number } = {
	atb: 0.57,
	commuter: 0.55,
	road: 0.55,
	racing: 0.36,
};

export const stdBikeDragCoefficient: { [k in GlobalState['bike']['type']]: number } = {
	atb: 1.2,
	commuter: 1.15,
	road: 1.0,
	racing: 0.88,
};

// From U.S. Standard Atmosphere 1976: Standard Atmosphere Air Properties
const stdAtmAirDensity = [
	1.347, // -1000 m
	1.225, // 0 m
	1.112, // 1000 m
	1.007, // 2000 m
	0.9093, // 3000 m
	0.8194, // 4000 m
	0.7364, // 5000 m
	0.6601, // 6000 m
	0.59, // 7000 m
	0.5258, // 8000 m
	0.4671, // 9000 m
	0.4135, // 10000 m
];

// Return unit kg/m^3
function getAirDensity(alt: number): number {
	let i: number;

	if (alt <= -500) {
		i = 0;
	} else if (alt <= 0) {
		i = 1;
	} else if (alt >= 10000) {
		i = 11;
	} else {
		i = Math.round(alt / 1000) + 1;
	}

	return stdAtmAirDensity[i];
}

export function calcWindResistanceCoeff(bikeFrontalArea: number, bikeDragCoefficient: number, altitudeMeters: number) {
	return bikeFrontalArea * bikeDragCoefficient * getAirDensity(altitudeMeters);
}
