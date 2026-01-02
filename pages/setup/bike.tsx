// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import useUserConfigUpdater from 'lib/useUserConfigUpdater';
import { classes, StyledParam } from 'components/SetupComponents';
import { isValidUnsigned } from 'lib/validation';
import { useGlobalState } from 'lib/global';

const bikeInfo = `Bike type is used to estimate the drag coefficient which is needed to calculate a realistic wind resistance.
Wheel diameter is used for distance calculation.
Bike weight is used to calculate the gravitational resistance when the slope control is used.`;

function WheelCircumference() {
	const [bike, setBike] = useGlobalState('bike');
	const [tmp, setTmp] = useState(bike.wheelCircumference);

	const handleChange = (event) => {
		const raw = event.target.value;
		const value = Number(raw);

		setTmp(raw);
		if (isValidUnsigned(value)) {
			setBike({
				...bike,
				wheelCircumference: value,
			});
		}
	};

	return (
		<FormControl className={classes.form}>
		<TextField
			autoComplete="off"
			className={classes.form}
			value={tmp}
			error={!isValidUnsigned(Number(tmp))}
			onChange={handleChange}
			id="outlined-basic"
			label="Wheel Circumference"
			variant="outlined"
			InputProps={{
				endAdornment: <InputAdornment position="end">mm</InputAdornment>,
			}}
		/>
		</FormControl>
	);
}

function BikeWeight() {
	const [bike, setBike] = useGlobalState('bike');
	const [tmp, setTmp] = useState(bike.weight);

	const handleChange = (event) => {
		const raw = event.target.value;
		const value = Number(raw);

		setTmp(raw);
		if (isValidUnsigned(value)) {
			setBike({
				...bike,
				weight: value,
			});
		}
	};

	return (
		<FormControl className={classes.form}>
		<TextField
			autoComplete="off"
			className={classes.form}
			value={tmp}
			error={!isValidUnsigned(Number(tmp))}
			onChange={handleChange}
			id="outlined-basic"
			label="Bike Weight"
			variant="outlined"
			InputProps={{
				endAdornment: <InputAdornment position="end">kg</InputAdornment>,
			}}
		/>
		</FormControl>
	);
}

function BikeType() {
	const [bike, setBike] = useGlobalState('bike');

	const handleChange = (event) => {
		setBike({
			...bike,
			type: event.target.value,
		});
	};

	return (
		<FormControl className={classes.form} sx={{ marginBottom: '1ex' }}>
		<InputLabel id="select-bike-type-helper-label">Bike Type</InputLabel>
		<Select variant="outlined" label="Bike Type" labelId="select-bike-type-helper-label" value={bike.type} onChange={handleChange} defaultValue="road">
			<MenuItem value="atb">ATB/MTB</MenuItem>
			<MenuItem value="commuter">Commuter</MenuItem>
			<MenuItem value="road">Road</MenuItem>
			<MenuItem value="racing">Racing</MenuItem>
		</Select>
		</FormControl>
	);
}

export default function SetupBike() {
	useUserConfigUpdater();

	return (
		<Container maxWidth="md">
			<MyHead title="Bike" />
			<Box>
				<Title href="/setup">Bike</Title>
				<p>Setup the bike measurements.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<StyledParam title="Bike Parameters" info={bikeInfo} image="/images/cards/patent.jpg">
							<BikeType />
							<WheelCircumference />
							<BikeWeight />
					</StyledParam>
				</Grid>
			</Box>
		</Container>
	);
}
