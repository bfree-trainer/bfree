// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconResistance from '@mui/icons-material/FitnessCenter';
import InputAdornment from '@mui/material/InputAdornment';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled } from '@mui/material/styles';
import { useEffect, useState, useMemo } from 'react';
import { useGlobalState, ControlParams } from 'lib/global';
import {
	stdBikeFrontalArea,
	stdBikeDragCoefficient,
	rollingResistanceCoeff,
	calcWindResistanceCoeff,
} from 'lib/virtual_params';
import { PowerLimits } from 'components/ride/PowerResistance';

const PREFIX = 'ResistanceControl';
const classes = {
	root: `${PREFIX}-root`,
	thumb: `${PREFIX}-thumb`,
	active: `${PREFIX}-active`,
	valueLabel: `${PREFIX}-valueLabel`,
	markLabel: `${PREFIX}-markLabel`,
	track: `${PREFIX}-track`,
	rail: `${PREFIX}-rail`,
	resistanceControlCard: `${PREFIX}-resistanceControlCard`,
	resistanceControlSlider: `${PREFIX}-resistanceControlSlider`,
	inlineIcon: `${PREFIX}-inlineIcon`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.markLabel}`]: {
		marginTop: '1.5ex',
	},
	[`& .${classes.resistanceControlCard}`]: {
		minHeight: '10em',
	},
	[`& .${classes.resistanceControlSlider}`]: {
		paddingTop: '3em',
	},
	[`& .${classes.inlineIcon}`]: {
		fontSize: '18px !important',
	},
}));

export type Resistance = 'basic' | 'power' | 'slope';
type SendResistanceFunc = (value: number) => Promise<void>;

const objectMap = (obj: any, fn: (v: any, k: string, i: number) => any): any =>
	Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));
const valuetext = (value: number) => `${value}`;

const ResistanceSlider = Slider;

type Params = {
	[k in Resistance]: {
		resistanceControlName: string;
		resistanceStep: number;
		minResistance: number;
		maxResistance: number;
		resistanceUnit: string;
		defaultResistance: number;
	};
};

// TODO this is silly now. We can just make a function that returns the needed object by key.
function r2marks(params: Params): { [k in Resistance]: { value: number; label: string }[] } {
	return objectMap(params, (v) => [
		{
			value: 0,
			label: `0 ${v.resistanceUnit}`,
		},
		{
			value: v.maxResistance / 2,
			label: `${v.maxResistance / 2} ${v.resistanceUnit}`,
		},
		{
			value: v.maxResistance,
			label: `${v.maxResistance} ${v.resistanceUnit}`,
		},
	]);
}

// TODO Could split this into three somehow
export default function ResistanceControl({
	resistance,
	rollingResistance,
	powerLimits,
}: {
	resistance: Resistance;
	rollingResistance?: number;
	powerLimits: PowerLimits;
}) {
	const params: Params = {
		basic: {
			resistanceControlName: 'Basic Resistance',
			resistanceStep: 5,
			minResistance: 0,
			maxResistance: 100,
			resistanceUnit: '%',
			defaultResistance: 15,
		},
		power: {
			resistanceControlName: 'Target Power',
			resistanceStep: 10,
			minResistance: powerLimits.min,
			maxResistance: powerLimits.max,
			resistanceUnit: 'W',
			defaultResistance: Math.round(0.15 * powerLimits.max),
		},
		slope: {
			resistanceControlName: 'Slope',
			resistanceStep: 0.5,
			minResistance: 0,
			maxResistance: 40,
			resistanceUnit: '%',
			defaultResistance: 5,
		},
	};
	const isBreakpoint = useMediaQuery('(min-width:800px)');
	const { resistanceControlName, resistanceStep, maxResistance, resistanceUnit, defaultResistance } =
		params[resistance];
	const marks = isBreakpoint ? r2marks(params)[resistance] : null;
	const [smartTrainerControl] = useGlobalState('smart_trainer_control');
	const [_controlParams, setControlParams] = useGlobalState('control_params');
	const [bike] = useGlobalState('bike');
	const [enabled, setEnabled] = useState(false);
	const [currentResistanceValue, setCurrentResistanceValue] = useState(defaultResistance); // TODO We should probably get this from the trainer
	const altitude = 0;
	const windSpeed = 0; // head/tail component.
	const draftingFactor = 1.0; // 0.0 would be no air resistance simulation, where as 1.0 means no drafting effect.
	const windResistanceCoeff = useMemo(
		() => calcWindResistanceCoeff(stdBikeFrontalArea[bike.type], stdBikeDragCoefficient[bike.type], altitude),
		[bike]
	);
	const sendResistance = useMemo((): SendResistanceFunc => {
		if (!smartTrainerControl) {
			return async (_value: number) => {
				console.log('sendResistance failed: No smart trainer connected');
			};
		}
		switch (resistance) {
			case 'basic':
				return async (value: number) => await smartTrainerControl.sendBasicResistance(value);
			case 'power':
				return async (value: number) => await smartTrainerControl.sendTargetPower(value);
			case 'slope':
				return async (value: number) => {
					await smartTrainerControl.sendWindResistance(windResistanceCoeff, windSpeed, draftingFactor);
					await smartTrainerControl.sendSlope(value, rollingResistance || rollingResistanceCoeff.asphalt);
					setControlParams((prev: ControlParams) => ({ ...prev, slope: value }));
				};
			default:
				throw new Error('Unknown resistance mode');
		}
	}, [resistance, rollingResistance, smartTrainerControl, windResistanceCoeff, setControlParams]);

	// Set the initial resistance and mode + register a cleanup.
	// Note: defaultResistance is not in the deps because we don't care
	//       if it changes.
	// TODO sendResistance could change in theory
	useEffect(() => {
		sendResistance(defaultResistance)
			.catch(console.error)
			.then(() => setEnabled(true));

		return () => {
			// Reset resistance to zero.
			sendResistance(0).catch(console.error);
			setControlParams((prev: ControlParams) => {
				const newParams = { ...prev };

				delete newParams.slope;

				return newParams;
			});
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleChange = (_ev: never, value: number) => {
		setEnabled(false);
		sendResistance(value)
			.catch(console.error)
			.then(() => {
				setCurrentResistanceValue(value);
				setEnabled(true);
			});
	};

	return (
		<StyledGrid item xs={isBreakpoint ? 4 : 8}>
			<Card variant="outlined">
				<CardContent className={classes.resistanceControlCard}>
					<Typography id="resistance-control" gutterBottom variant="h5" component="h2">
						<IconResistance className={classes.inlineIcon} /> {isBreakpoint ? resistanceControlName : ''}
					</Typography>
					{isBreakpoint ? (
						<Container>
							<ResistanceSlider
								className={classes.resistanceControlSlider}
								valueLabelDisplay="on"
								aria-labelledby="resistance-control"
								getAriaValueText={valuetext}
								aria-label="resistance slider"
								disabled={!enabled}
								marks={marks}
								min={0}
								step={resistanceStep}
								max={maxResistance}
								defaultValue={defaultResistance}
								onChangeCommitted={handleChange}
								classes={{
									root: classes.root,
									thumb: classes.thumb,
									active: classes.active,
									valueLabel: classes.valueLabel,
									markLabel: classes.markLabel,
									track: classes.track,
									rail: classes.rail,
								}}
							/>
						</Container>
					) : (
						<Container>
							<TextField
								id="outlined-read-only-input"
								label={resistance}
								defaultValue={defaultResistance}
								InputProps={{
									readOnly: true,
									endAdornment: <InputAdornment position="end">{resistanceUnit}</InputAdornment>,
								}}
								size="small"
								value={currentResistanceValue}
							/>
							<ButtonGroup variant="outlined" orientation="vertical" aria-label="resistance-control">
								<Button
									onClick={(v) => {
										if (currentResistanceValue + resistanceStep <= maxResistance) {
											setCurrentResistanceValue(currentResistanceValue + resistanceStep);
										}
									}}
								>
									+
								</Button>
								<Button
									onClick={(v) => {
										if (currentResistanceValue - resistanceStep >= 0) {
											setCurrentResistanceValue(currentResistanceValue - resistanceStep);
										}
									}}
								>
									-
								</Button>
							</ButtonGroup>
						</Container>
					)}
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
