// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { rollingResistanceCoeff } from 'lib/virtual_params';
import { ReactNode } from 'react';
import RideSetupCard, { SetupFormControl } from 'components/ride/RideSetupCard';

const predefinedRollingResistances: [string, number][] = [
	['Wooden track', rollingResistanceCoeff.wood],
	['Concrete', rollingResistanceCoeff.concrete],
	['Asphalt road', rollingResistanceCoeff.asphalt],
	['Rough road', rollingResistanceCoeff.rough],
];

function getTrackImg(rollingResistance: number) {
	if (rollingResistance <= predefinedRollingResistances[0][1]) {
		// wooden
		return '/images/cards/wooden.jpg';
	} else if (rollingResistance <= predefinedRollingResistances[1][1]) {
		// Concrete
		return '/images/cards/concrete.jpg';
	} else if (rollingResistance <= predefinedRollingResistances[2][1]) {
		// Asphalt
		return '/images/cards/slope.jpg';
	} else {
		// Rough
		return '/images/cards/dirt_road.jpg';
	}
}

export default function RollingResistance({
	rollingResistance,
	setRollingResistance,
}: {
	rollingResistance: number;
	setRollingResistance: ReturnType<typeof useState>[1];
}) {
	const handleChange = (event: SelectChangeEvent<number>, _child?: ReactNode) => {
		setRollingResistance(event.target.value || 0);
	};

	useEffect(() => {
		setRollingResistance((prev: number) => (Number.isNaN(prev) ? predefinedRollingResistances[2][1] : prev));
	}, [setRollingResistance]);

	return (
		<RideSetupCard title="Rolling Resistance" image={getTrackImg(rollingResistance)}>
			<SetupFormControl>
				<InputLabel id="resistance-mode-select-label">Mode</InputLabel>
				<Select
					variant="standard"
					labelId="resistance-mode-select-label"
					id="resistance-mode-select"
					value={rollingResistance || 0}
					onChange={handleChange}
				>
					{predefinedRollingResistances.map((r) => (
						<MenuItem key={r[0].toLowerCase().replace(/\s/g, '-')} value={r[1]}>
							{r[0]}
						</MenuItem>
					))}
				</Select>
			</SetupFormControl>
			<br />
			<SetupFormControl>
				<TextField
					value={rollingResistance || 0}
					error={rollingResistance <= 0}
					onChange={
						// @ts-ignore
						(e) => handleChange(e)
					}
					id="outlined-basic"
					label="Coefficient"
					variant="outlined"
				/>
			</SetupFormControl>
		</RideSetupCard>
	);
}
