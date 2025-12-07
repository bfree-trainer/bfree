// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

type ValueOf<T> = T[keyof T];

export interface UnitConv {
	[index: string]: {
		name: string;
		convTo: (v: number) => number;
		convToBase: (v: number) => number;
	};
}

export const timeUnitConv: UnitConv = {
	ms: {
		name: 'millisecond',
		convTo: (v) => v * 1000,
		convToBase: (v) => v / 1000,
	},
	sec: {
		name: 'second',
		convTo: (v) => v,
		convToBase: (v) => v,
	},
	min: {
		name: 'minute',
		convTo: (v) => v / 60,
		convToBase: (v) => v * 60,
	},
	hour: {
		name: 'hour',
		convTo: (v) => v / 3600,
		convToBase: (v) => v * 3600,
	},
};

export const speedUnitConv: UnitConv = {
	kmph: {
		name: 'km/h',
		convTo: (v) => v * 3.6,
		convToBase: (v) => v / 3.6, // to m/s
	},
	mph: {
		name: 'mph',
		convTo: (v) => v * 2.237,
		convToBase: (v) => v / 2.237, // to m/s
	},
};

export const distanceUnitConv: UnitConv = {
	km: {
		name: 'km',
		convTo: (d) => d / 1000,
		convToBase: (d) => d * 1000, // to m
	},
	m: {
		name: 'm',
		convTo: (d) => d,
		convToBase: (d) => d,
	},
	in: {
		name: 'in',
		convTo: (d) => d * 39.3700787402,
		convToBase: (d) => d * 0.0254, // to m
	},
	ft: {
		name: 'ft',
		convTo: (d) => d * 3.2808,
		convToBase: (d) => d * 0.3048, // to m
	},
	yd: {
		name: 'yd',
		convTo: (d) => d * 1.0936132983,
		convToBase: (d) => d * 0.9144, // to m
	},
	mi: {
		name: 'mi',
		convTo: (d) => d * 0.000621,
		convToBase: (d) => d * 1609, // to m
	},
};

function doConv(conv: ValueOf<UnitConv>, dMeters: number): [number, string] {
	return [conv.convTo(dMeters), conv.name];
}

function makePretty(v: ReturnType<typeof doConv>, fd: number) {
	return `${v[0].toFixed(fd)} ${v[1]}`;
}

export function smartDistanceUnitFormat(distanceUnit: keyof UnitConv, dMeters: number | null): string {
	let v: ReturnType<typeof doConv>;

	if (typeof dMeters !== 'number') {
		return '--';
	}

	switch (distanceUnit) {
		case 'km':
			v = doConv(distanceUnitConv.km, dMeters);
			if (v[0] >= 1) {
				return makePretty(v, 2);
			}
		case 'm':
			v = doConv(distanceUnitConv.m, dMeters);
			return makePretty(v, 0);
		case 'mi':
			v = doConv(distanceUnitConv.mi, dMeters);
			if (v[0] >= 1.0) {
				return makePretty(v, 2);
			}
		case 'yd':
			v = doConv(distanceUnitConv.yd, dMeters);
			if (distanceUnit == 'yd' || v[0] >= 1.0) {
				return makePretty(v, 2);
			}
		case 'ft':
			v = doConv(distanceUnitConv.ft, dMeters);
			return makePretty(v, 0);
	}
}
