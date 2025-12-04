import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MyHead from 'components/MyHead';
import Title from 'components/Title';

export default function RideWorkout() {
	return (
		<Container maxWidth="md">
			<MyHead title="Virtual Ride" />
			<Box>
				<Title href="/ride">Virtual Ride</Title>
				<p>Select something if you can...</p>

				<Grid container direction="row" alignItems="center" spacing={2}></Grid>
			</Box>
		</Container>
	);
}
