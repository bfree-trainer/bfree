// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconHourglass from '@mui/icons-material/HourglassEmpty';
import Typography from '@mui/material/Typography';

const PREFIX = 'DummyCard';
const classes = {
	dummyCard: `${PREFIX}-dummyCard`,
	inlineIcon: `${PREFIX}-inlineIcon`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.dummyCard}`]: {
		height: '10em',
	},

	[`& .${classes.inlineIcon}`]: {
		fontSize: '18px !important',
	},
}));

export default function DummyCard() {
	return (
		<StyledGrid item xs={4}>
			<Card variant="outlined">
				<CardContent className={classes.dummyCard}>
					<Typography id="resistance-control" gutterBottom variant="h5" component="h2">
						<IconHourglass className={classes.inlineIcon} /> Loading...
					</Typography>
					<Container>Starting your ride...</Container>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
