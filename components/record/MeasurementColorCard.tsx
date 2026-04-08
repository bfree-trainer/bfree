// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import IconHeart from '@mui/icons-material/Favorite';
import IconPower from '@mui/icons-material/OfflineBolt';
import IconSpeed from '@mui/icons-material/Speed';
import SxPropsTheme from '../../lib/SxPropsTheme';

const PREFIX = 'MeasurementColorCard';
const classes = {
	root: `${PREFIX}-root`,
	thumb: `${PREFIX}-thumb`,
	active: `${PREFIX}-active`,
	valueLabel: `${PREFIX}-valueLabel`,
	markLabel: `${PREFIX}-markLabel`,
	track: `${PREFIX}-track`,
	rail: `${PREFIX}-rail`,
	resistanceControlCard: `${PREFIX}-resistanceControlCard`,
	resistanceControlSlider: `${PREFIX}-resistanceControlSlider`,
	inlineIcon: `${PREFIX}-inlineIcon`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.resistanceControlCard}`]: {
		height: '10em',
	},

	[`& .${classes.resistanceControlSlider}`]: {
		paddingTop: '3em',
	},

	[`& .${classes.inlineIcon}`]: {
		fontSize: '18px !important',
	},
}));

const iconStyle: SxPropsTheme = {
	fontSize: '18px !important',
};

export default function MeasurementColorCard({
	colors,
}: {
	colors: { heart_rate: string; power: string; speed: string };
}) {
	return (
		<Container>
			<IconSpeed sx={{ ...iconStyle, color: colors.speed }} />
			<IconPower sx={{ ...iconStyle, color: colors.power }} />
			<IconHeart sx={{ ...iconStyle, color: colors.heart_rate }} />
		</Container>
	);
}
