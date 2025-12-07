// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MyHead from 'components/MyHead';
import SxPropsTheme from 'lib/SxPropsTheme';
import Title from 'components/Title';
import useUserConfigUpdater from 'lib/useUserConfigUpdater';
import { classes, StyledParam } from 'components/SetupComponents';
import { isValidUnsigned } from 'lib/validation';
import { useGlobalState } from 'lib/global';
import { useState } from 'react';

const weightInfo = 'User weight is used to calculate the gravitational resistance when the slope control is used.';
const ftpInfo = 'FTP is used by predefined workouts to generate the optimal exercise for every rider.';

const textFieldStyle: SxPropsTheme = {
	width: '25ch',
	paddingBottom: '1ex',
};

function Weight() {
	const [rider, setRider] = useGlobalState('rider');
	const [tmp, setTmp] = useState(rider.weight);

	const handleChange = (event) => {
		const raw = event.target.value;
		const value = Number(raw);

		setTmp(raw);
		if (isValidUnsigned(value)) {
			setRider({
				...rider,
				weight: value,
			});
		}
	};

	return (
		<StyledParam title="Weight" info={weightInfo} image="/images/cards/scale.jpg">
			<TextField
				autoComplete="off"
				className={classes.form}
				value={tmp}
				error={!isValidUnsigned(Number(tmp))}
				onChange={handleChange}
				id="outlined-basic"
				label="kg"
				variant="outlined"
			/>
		</StyledParam>
	);
}

function FTPValue() {
	const [rider, setRider] = useGlobalState('rider');
	const [tmp, setTmp] = useState(rider.ftp);

	const handleChange = (event) => {
		const raw = event.target.value;
		const value = Number(raw);

		setTmp(raw);
		if (isValidUnsigned(value)) {
			setRider({
				...rider,
				ftp: value,
			});
		}
	};

	return (
		<StyledParam title="FTP" info={ftpInfo} image="/images/cards/ftp.jpg">
			<TextField
				autoComplete="off"
				className={classes.form}
				value={tmp}
				error={!isValidUnsigned(Number(tmp))}
				onChange={handleChange}
				id="outlined-basic"
				label="Watt"
				variant="outlined"
			/>
		</StyledParam>
	);
}

function HeartRate() {
	const [rider, setRider] = useGlobalState('rider');
	const [tmpRest, setTmpRest] = useState(rider.heartRate.rest);
	const [tmpMax, setTmpMax] = useState(rider.heartRate.max);

	const handleRestChange = (event) => {
		const raw = event.target.value;
		const value = Number(raw);

		setTmpRest(raw);
		if (isValidUnsigned(value)) {
			setRider({
				...rider,
				heartRate: {
					rest: value,
					max: rider.heartRate.max,
				},
			});
		}
	};
	const handleMaxChange = (event) => {
		const raw = event.target.value;
		const value = Number(raw);

		setTmpMax(raw);
		if (isValidUnsigned(value)) {
			setRider({
				...rider,
				heartRate: {
					rest: rider.heartRate.rest,
					max: value,
				},
			});
		}
	};

	return (
		<StyledParam title="Heart Rate" image="/images/cards/tempo.jpg">
			<Container>
				<TextField
					autoComplete="off"
					value={tmpRest}
					error={!isValidUnsigned(Number(tmpRest))}
					onChange={handleRestChange}
					id="outlined-basic"
					label="Rest BPM"
					variant="outlined"
					sx={textFieldStyle}
				/>
				<TextField
					value={tmpMax}
					error={!isValidUnsigned(Number(tmpMax))}
					onChange={handleMaxChange}
					id="outlined-basic"
					label="Max BPM"
					variant="outlined"
					sx={textFieldStyle}
				/>
			</Container>
		</StyledParam>
	);
}

export default function SetupRider() {
	useUserConfigUpdater();

	return (
		<Container maxWidth="md">
			<MyHead title="Rider" />
			<Box>
				<Title href="/setup">Rider</Title>
				<p>Set the rider weight and other measurements.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<Weight />
					<FTPValue />
					<HeartRate />
				</Grid>
			</Box>
		</Container>
	);
}
