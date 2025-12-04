import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { useState, useEffect } from 'react';
import MyHead from '../../components/MyHead';
import StartButton from '../../components/StartButton';
import ResistanceMode from '../../components/ResistanceMode';
import RollingResistance from '../../components/RollingResistance';
import Title from '../../components/Title';

const StyledContainer = styled(Container)(({ theme }) => ({}));

function makeStartUrl(resistanceMode: string, rollingResistance: number) {
	if (resistanceMode === 'slope') {
		return `/ride/record?type=free&resistance=${resistanceMode}&rollingResistance=${rollingResistance}`;
	}
	return `/ride/record?type=free&resistance=${resistanceMode}`;
}

export default function RideFree() {
	const [resistanceMode, setResistanceMode] = useState('');
	const [rollingResistance, setRollingResistance] = useState(NaN);

	useEffect(() => {
		if (resistanceMode !== 'slope') {
			setRollingResistance(NaN);
		}
	}, [resistanceMode]);

	return (
		<StyledContainer maxWidth="md">
			<MyHead title="Free Ride" />
			<Box>
				<Title href="/ride">Free Ride</Title>
				<p>Start a free ride exercise.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<ResistanceMode mode={resistanceMode} setMode={setResistanceMode} />
					{resistanceMode === 'slope' ? (
						<RollingResistance
							rollingResistance={rollingResistance}
							setRollingResistance={setRollingResistance}
						/>
					) : (
						<br />
					)}
				</Grid>
			</Box>
			<Box
				sx={{ left: 0, width: '100%' }}
				position="sticky"
				bottom="0px"
				m="auto"
				display="flex"
				justifyContent="center"
				padding="1ex"
			>
				<StartButton disabled={!resistanceMode} href={makeStartUrl(resistanceMode, rollingResistance)} />
			</Box>
		</StyledContainer>
	);
}
