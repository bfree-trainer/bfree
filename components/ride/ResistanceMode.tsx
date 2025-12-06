import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

const PREFIX = 'ResistanceMode';
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

export type TrainerResistanceMode = '' | 'basic' | 'power' | 'slope';

export default function ResistanceMode({
	mode,
	setMode,
}: {
	mode: TrainerResistanceMode;
	setMode: (m: TrainerResistanceMode) => void;
}) {
	const handleChange = (event: SelectChangeEvent<string>, _child?: ReactNode) => {
		setMode(event.target.value as TrainerResistanceMode);
	};

	return (
		<StyledGrid item>
			<Card variant="outlined">
				<CardMedia
					className={classes.media}
					image="/images/cards/roller.jpg"
					title="spinning on roller; Klasická kola umístěna na otáčecí válce a zapojena na měřič rychlosti."
				/>
				<Typography gutterBottom variant="h5" component="h2">
					Resistance Mode
				</Typography>
				<CardContent className={classes.setupCard}>
					<FormControl className={classes.formControl}>
						<InputLabel id="demo-simple-select-label">Mode</InputLabel>
						<Select
							variant="standard"
							labelId="resistance-mode-select-label"
							id="resistance-mode-select"
							value={mode}
							onChange={handleChange}
						>
							<MenuItem value={'basic'}>Basic resistance</MenuItem>
							<MenuItem value={'power'}>Power</MenuItem>
							<MenuItem value={'slope'}>Slope</MenuItem>
						</Select>
					</FormControl>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
