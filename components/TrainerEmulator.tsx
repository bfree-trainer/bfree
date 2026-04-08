// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import IconBike from '@mui/icons-material/DirectionsBike';
import { getEmulatorState, setEmulatorVirtualSpeed } from 'lib/ble/trainer_emulator';
import { useGlobalState } from 'lib/global';

const MAX_SPEED_KMH = 60;

function speedMsToKmh(v: number) {
	return v * 3.6;
}

function speedKmhToMs(v: number) {
	return v / 3.6;
}

/** Overlay shown on the ride/record page when the trainer emulator is active. */
export function TrainerEmulatorOverlay() {
	const [smartTrainerControl] = useGlobalState('smart_trainer_control');
	const [speedKmh, setSpeedKmh] = useState(0);

	// Poll the emulator state so the label updates when mode changes externally.
	const [modeLabel, setModeLabel] = useState('');
	const [resistanceLabel, setResistanceLabel] = useState('');

	useEffect(() => {
		const id = setInterval(() => {
			const s = getEmulatorState();
			switch (s.mode) {
				case 'basic':
					setModeLabel('Basic resistance');
					setResistanceLabel(`${s.basicResistance.toFixed(0)} %`);
					break;
				case 'power':
					setModeLabel('Target power');
					setResistanceLabel(`${s.targetPower} W`);
					break;
				case 'slope':
					setModeLabel('Slope');
					setResistanceLabel(`${s.grade.toFixed(1)} %`);
					break;
			}
		}, 500);
		return () => clearInterval(id);
	}, []);

	if (!smartTrainerControl) return null;

	const handleSpeedChange = (_ev: Event, value: number | number[]) => {
		const kmh = value as number;
		setSpeedKmh(kmh);
		setEmulatorVirtualSpeed(speedKmhToMs(kmh));
	};

	return (
		<Paper
			elevation={4}
			sx={{
				position: 'fixed',
				bottom: 80,
				right: 16,
				zIndex: 1300,
				padding: 2,
				width: 220,
				opacity: 0.92,
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
				<IconBike fontSize="small" />
				<Typography variant="subtitle2" fontWeight="bold">
					Trainer Emulator
				</Typography>
			</Box>

			<Typography variant="caption" color="text.secondary">
				Mode: {modeLabel}
			</Typography>
			<br />
			<Typography variant="caption" color="text.secondary">
				Resistance: {resistanceLabel}
			</Typography>

			<Typography variant="body2" sx={{ mt: 1 }}>
				Speed: {speedKmh.toFixed(1)} km/h
			</Typography>
			<Slider
				value={speedKmh}
				min={0}
				max={MAX_SPEED_KMH}
				step={0.5}
				aria-label="Virtual speed"
				onChange={handleSpeedChange}
				size="small"
			/>
		</Paper>
	);
}
