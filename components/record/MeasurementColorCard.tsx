// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Container from '@mui/material/Container';
import IconHeart from '@mui/icons-material/Favorite';
import IconPower from '@mui/icons-material/OfflineBolt';
import IconSpeed from '@mui/icons-material/Speed';
import SxPropsTheme from '../../lib/SxPropsTheme';
import { inlineIconFontSize } from '../../lib/tokens';

const iconStyle: SxPropsTheme = {
	fontSize: inlineIconFontSize,
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
