import Title from 'components/Title';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MyHead from 'components/MyHead';
import MenuCard from 'components/MenuCard';

export default function Setup() {
	return (
		<Container maxWidth="md">
			<MyHead title="Setup" />
			<Box>
				<Title href="/">Setup</Title>
				<p>Configure your trainer setup here.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<MenuCard title="General" href="/setup/general">
						Configure measurement units and UX settings.
					</MenuCard>
					<MenuCard title="Measurements" href="/setup/measurements">
						Select measurement sources for recording.
					</MenuCard>
					<MenuCard title="Rider" href="/setup/rider">
						Configure the rider profile.
					</MenuCard>
					<MenuCard title="Bike" href="/setup/bike">
						Set the bike measurements.
					</MenuCard>
					<MenuCard title="Sensors" href="/setup/sensors">
						Connect to BLE sensors.
					</MenuCard>
				</Grid>
			</Box>
		</Container>
	);
}
