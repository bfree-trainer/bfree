import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import SxPropsTheme from 'lib/SxPropsTheme';
import { useGlobalState } from 'lib/global';

const distanceStyle: SxPropsTheme = {
	float: 'right',
};

export default function Distance() {
	const [rideDistance] = useGlobalState('rideDistance');

	// TODO meters & km based on length
	// TODO lap distance
	return (
		<Grid item xs={4}>
			<Card variant="outlined">
				<CardContent sx={{ height: '10em' }}>
					<Typography gutterBottom variant="h5" component="h2">
						Distance
					</Typography>
					<Container>
						<b>Ride distance:</b> <Box sx={distanceStyle}>{rideDistance}</Box>
						<br />
						<b>Lap distance:</b> <Box sx={distanceStyle}>--</Box>
					</Container>
				</CardContent>
			</Card>
		</Grid>
	);
}
