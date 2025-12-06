import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import IconHelpOutline from '@mui/icons-material/HelpOutline';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { ReactNode, useState } from 'react';
import { useGlobalState } from 'lib/global';
import { isValidUnsigned } from 'lib/validation';

const PREFIX = 'SetupComponents';
export const classes = {
	root: `${PREFIX}-root`,
	setupCard: `${PREFIX}-setupCard`,
	media: `${PREFIX}-media`,
	form: `${PREFIX}-form`,
};
const makeStyles = ({ theme }: { theme: Theme }) => ({
	[`& .${classes.root}`]: {
		display: 'flex',
		alignItems: 'center',
	},

	[`& .${classes.setupCard}`]: {
		maxWidth: '64vw',
		minHeight: '6em',
		maxHeight: '20em',
	},

	[`& .${classes.media}`]: {
		height: 120,
	},

	[`& .${classes.form}`]: {
		'& > *': {
			width: '25ch',
			marginBottom: '0.5em',
		},
	},
});

export const StyledCard = styled(Card)(makeStyles);
export const StyledParam = styled(Param)(makeStyles);

export function ParamInfo({ info }: { info: string }) {
	return (
		<Tooltip title={info}>
			<IconHelpOutline color="primary" fontSize="small" />
		</Tooltip>
	);
}

function Param({ title, image, info, children }: { title: string; image: string; info?: string; children: ReactNode }) {
	return (
		<Grid item xs="auto">
			<StyledCard sx={{ minWidth: '30ex' }} variant="outlined">
				<CardMedia className={classes.media} image={image} title="Filler image" />
				<Typography gutterBottom variant="h5" component="h2" sx={{ marginLeft: '1ex' }}>
					{title}
					{info ? <ParamInfo info={info} /> : ''}
				</Typography>
				<CardContent className={classes.setupCard}>{children}</CardContent>
			</StyledCard>
		</Grid>
	);
}

export function UnsignedField({
	label,
	initialValue,
	unit,
	setValue,
}: {
	label?: string;
	initialValue: number;
	unit?: string;
	setValue: (v: number) => void;
}) {
	const [tmp, setTmp] = useState(initialValue);

	const handleChange = (event) => {
		const raw = event.target.value;
		const v = Number(raw);

		setTmp(raw);
		if (isValidUnsigned(v)) {
			setValue(v);
		}
	};

	return (
		<TextField
			autoComplete="off"
			value={tmp}
			error={!isValidUnsigned(Number(tmp))}
			onChange={handleChange}
			id="outlined-basic"
			label={label}
			InputProps={{
				endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined,
			}}
			variant="outlined"
		/>
	);
}

export function UnsignedConfigParam({
	title,
	image,
	label,
	unit,
	configName,
}: {
	title: string;
	image: string;
	label?: string;
	unit?: string;
	configName: string;
}) {
	// @ts-ignore
	const [value, setValue] = useGlobalState(configName);

	return (
		<StyledParam title={title} image={image}>
			<UnsignedField label={label} initialValue={value} unit={unit} setValue={setValue} />
		</StyledParam>
	);
}

export function EnumConfigParam({
	idPrefix,
	title,
	image,
	label,
	helpLabel,
	items,
	configName,
}: {
	idPrefix?: string;
	title: string;
	image: string;
	label?: string;
	helpLabel?: string;
	items: [string, string][];
	configName: string;
}) {
	// @ts-ignore
	const [value, setValue] = useGlobalState(configName);
	const handleChange = (event: SelectChangeEvent<string>) => setValue(event.target.value);

	return (
		<StyledParam title={title} image={image}>
			<FormControl className={classes.form}>
				<InputLabel shrink id="demo-simple-select-placeholder-label-label">
					{label}
				</InputLabel>
				<Select
					variant="standard"
					labelId={`${idPrefix || label}-label`}
					id={`${idPrefix || label}-label`}
					value={value}
					onChange={handleChange}
				>
					{items.map(([key, name]) => (
						<MenuItem key={key} value={key}>
							{name}
						</MenuItem>
					))}
				</Select>
				{helpLabel ? <FormHelperText>{helpLabel}</FormHelperText> : ''}
			</FormControl>
		</StyledParam>
	);
}
