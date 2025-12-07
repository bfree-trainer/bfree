// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import BatteryUnknownIcon from '@mui/icons-material/BatteryUnknown';
import Battery0Icon from '@mui/icons-material/BatteryAlert';
import Battery20Icon from '@mui/icons-material/Battery20';
import Battery30Icon from '@mui/icons-material/Battery30';
import Battery50Icon from '@mui/icons-material/Battery50';
import Battery60Icon from '@mui/icons-material/Battery60';
import Battery80Icon from '@mui/icons-material/Battery80';
import Battery90Icon from '@mui/icons-material/Battery90';
import Battery100Icon from '@mui/icons-material/BatteryFull';
import Tooltip from '@mui/material/Tooltip';
import SxPropsTheme from 'lib/SxPropsTheme';

const style: SxPropsTheme = {
	verticalAlign: 'center',
	fontSize: '25px !important',
};

export default function BatteryLevel({ batteryLevel }: { batteryLevel: number }) {
	return (
		<Tooltip title={`${batteryLevel} %`} describeChild={true} enterTouchDelay={10}>
			{batteryLevel < 0 ? (
				<BatteryUnknownIcon sx={style} />
			) : batteryLevel < 20 ? (
				<Battery0Icon sx={style} />
			) : batteryLevel < 30 ? (
				<Battery20Icon sx={style} />
			) : batteryLevel < 50 ? (
				<Battery30Icon sx={style} />
			) : batteryLevel < 60 ? (
				<Battery50Icon sx={style} />
			) : batteryLevel < 80 ? (
				<Battery60Icon sx={style} />
			) : batteryLevel < 90 ? (
				<Battery80Icon sx={style} />
			) : batteryLevel < 100 ? (
				<Battery90Icon sx={style} />
			) : (
				<Battery100Icon sx={style} />
			)}
		</Tooltip>
	);
}
