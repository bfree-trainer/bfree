// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { green } from '@mui/material/colors';
import SxPropsTheme from 'lib/SxPropsTheme';
import BatteryLevel from 'components/BatteryLevel';

const buttonProgressStyle: SxPropsTheme = {
	color: green[500],
	position: 'absolute',
	top: '50%',
	left: '50%',
	marginTop: -12,
	marginLeft: -12,
};

export const settingsCardStyle: SxPropsTheme = {
	height: '19em',
	width: '20em',
};

export const iconStyle: SxPropsTheme = {
	fontSize: '18px !important',
};

export function ActionButton({
	wait,
	onClick,
	disabled,
	children,
}: {
	wait?: boolean;
	onClick?: () => void;
	disabled?: boolean;
	children: any;
}) {
	return (
		<Box>
			<Button disabled={wait || disabled} variant="contained" onClick={onClick}>
				{children}
				{wait && <CircularProgress size={24} sx={buttonProgressStyle} />}
			</Button>
		</Box>
	);
}

export function SensorCard({
	icon,
	title,
	batteryLevel,
	actions,
	children,
}: {
	icon: ReactNode;
	title: string;
	batteryLevel: number;
	actions?: ReturnType<typeof CardActions>;
	children: ReactNode;
}) {
	return (
		<Grid item xs="auto">
			<Card variant="outlined" sx={settingsCardStyle}>
				<CardContent sx={{ height: '15em' }}>
					<Box sx={{ position: 'relative' }}>
						<Box sx={{ position: 'absolute', width: '1em', right: 0.5, zIndex: 10 }}>
							{batteryLevel >= 0 ? <BatteryLevel batteryLevel={batteryLevel} /> : ''}
						</Box>
					</Box>
					<Typography gutterBottom variant="h5" component="h2">
						{icon} {`${title}`}
					</Typography>
					<Box>{children}</Box>
				</CardContent>
				{actions || ''}
			</Card>
		</Grid>
	);
}
