import Box from '@mui/system/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Image from 'next/image';
import MenuCard from 'components/MenuCard';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import bfreeImg from 'public/images/bfree.jpg';

export default function Home() {
	return (
		<Container maxWidth="md">
			<MyHead title="Cycling App" />
			<Box sx={{ width: '100%', height: '764px', left: '0px', top: '0px' }} overflow="hidden" position="absolute">
				<Image
					src={bfreeImg}
					alt="Bfree forever"
					loading="lazy"
					placeholder="blur"
					fill
					style={{
						maxWidth: '100%',
						objectFit: 'cover',
					}}
				/>
			</Box>
			<Box position="relative">
				<Title disableBack>Bfree</Title>
				<p>&nbsp;</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<MenuCard title="Ride" href="/ride">
						Start riding.
					</MenuCard>
					<MenuCard title="Previous Rides" href="/history">
						Manage and export previous rides.
					</MenuCard>
					<MenuCard title="Setup" href="/setup">
						Configure parameters and connect to a trainer and sensors.
					</MenuCard>
				</Grid>
			</Box>

			<Box
				sx={{ left: 0, width: '100%' }}
				position="absolute"
				bottom="0px"
				m="auto"
				display="flex"
				justifyContent="center"
			>
				<b>Bfree</b>&nbsp;2023
			</Box>
		</Container>
	);
}
