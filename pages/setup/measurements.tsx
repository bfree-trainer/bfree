import Box from '@mui/material/Box';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import DialogContentText from '@mui/material/DialogContentText';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import { classes, StyledCard } from 'components/SetupComponents';
import PriorityList from 'components/PriorityList';
import SetupDialog from 'components/SetupDialog';
import {
	GlobalState,
	SensorSourceType,
	SensorType,
	cadenceSourceTypes,
	powerSourceTypes,
	speedSourceTypes,
	useGlobalState,
} from '../../lib/global';
import SensorValue from '../../components/SensorValue';

// Config name mapping to plain sensor types.
// This allows us to show just the expected value using <SensorValue>.
const configName2sensorType: { [index: string]: SensorType } = {
	speedSources: 'cycling_speed',
	cadenceSources: 'cycling_cadence',
	powerSources: 'cycling_power',
};

function SelectedSensorValue({
	configName,
	selectedSensor,
}: {
	configName: keyof typeof configName2sensorType;
	selectedSensor: SensorType;
}) {
	const [sensorValue] = useGlobalState(selectedSensor) || [];

	return <SensorValue sensorType={configName2sensorType[configName]} sensorValue={sensorValue} />;
}

function ConfigureDialog({
	title,
	configName,
	sourceTypes,
}: {
	title: string;
	configName: keyof GlobalState;
	sourceTypes: SensorSourceType[];
}) {
	const [right, setRight] = useGlobalState(configName);
	const [left, setLeft] = useState(sourceTypes.filter((a) => !right.find((b) => a.id === b.id)));

	const handleLeftChange = (v: SensorSourceType[]) => setLeft(v);
	const handleRightChange = (v: SensorSourceType[]) => setRight(v);

	return (
		<SetupDialog btnText="Configure" title={title}>
			<DialogContentText sx={{ width: '40ch' }}>
				The sensors on the right side will be used for measurements, prioritized in top-down order.
			</DialogContentText>
			<PriorityList
				leftList={left}
				rightList={right}
				handleLeftChange={handleLeftChange}
				handleRightChange={handleRightChange}
			/>
		</SetupDialog>
	);
}

function DaqSourceCard({
	title,
	image,
	configName,
	sourceTypes,
}: {
	title: string;
	image: string;
	configName: keyof GlobalState;
	sourceTypes: SensorSourceType[];
}) {
	const [selectedSources] = useGlobalState(configName);
	const primarySource: SensorSourceType | null = selectedSources[0] || null;

	return (
		<Grid item xs="auto">
			<StyledCard sx={{ height: '42ex' }} variant="outlined">
				<CardMedia className={classes.media} image={image} title="Filler image" />
				<Typography gutterBottom variant="h5" component="h2" sx={{ marginLeft: '1ex' }}>
					{title}
				</Typography>
				<CardContent>
					<Typography gutterBottom sx={{ width: '10em', height: '12ex' }}>
						<b>Primary source</b>
						<br />
						{primarySource?.name || 'none'}
						<br />
						<b>Current reading</b>
						<br />
						{primarySource ? (
							<SelectedSensorValue configName={configName} selectedSensor={primarySource.id || null} />
						) : (
							'--'
						)}
					</Typography>
				</CardContent>
				<CardActions>
					<ConfigureDialog title={title} configName={configName} sourceTypes={sourceTypes} />
				</CardActions>
			</StyledCard>
		</Grid>
	);
}

export default function SetupMeasurements() {
	return (
		<Container maxWidth="md">
			<MyHead title="Measurements" />
			<Box>
				<Title href="/setup">Measurements</Title>
				<p>Select measurement sources for recording rides.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<DaqSourceCard
						title="Speed Source"
						image="/images/cards/tempo.jpg"
						configName="speedSources"
						sourceTypes={speedSourceTypes}
					/>
					<DaqSourceCard
						title="Cadence Source"
						image="/images/cards/pedals.jpg"
						configName="cadenceSources"
						sourceTypes={cadenceSourceTypes}
					/>
					<DaqSourceCard
						title="Power Source"
						image="/images/cards/force.jpg"
						configName="powerSources"
						sourceTypes={powerSourceTypes}
					/>
				</Grid>
			</Box>
		</Container>
	);
}
