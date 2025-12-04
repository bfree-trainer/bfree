import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { rollingResistanceCoeff } from 'lib/virtual_params';
import { ReactNode } from 'react';

const PREFIX = 'RollingResistance';

const classes = {
	setupCard: `${PREFIX}-setupCard`,
	media: `${PREFIX}-media`,
	formControl: `${PREFIX}-formControl`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.setupCard}`]: {
		height: '15em',
	},

	[`& .${classes.media}`]: {
		height: 120,
	},

	[`& .${classes.formControl}`]: {
		'& > *': {
			width: '25ch',
		},
	},
}));

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
		setRollingResistance((prev) => (Number.isNaN(prev) ? predefinedRollingResistances[2][1] : prev));
	}, [setRollingResistance]);

	return (
		<StyledGrid item>
			<Card variant="outlined">
				<CardMedia className={classes.media} image={getTrackImg(rollingResistance)} title="Filler image" />
				<Typography gutterBottom variant="h5" component="h2">
					Rolling Resistance
				</Typography>
				<CardContent className={classes.setupCard}>
					<FormControl className={classes.formControl}>
						<InputLabel id="demo-simple-select-label">Mode</InputLabel>
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
						<br />
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
					</FormControl>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
