// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import IconStart from '@mui/icons-material/PlayArrow';
import IconStartDisabled from '@mui/icons-material/PlayDisabled';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useGlobalState } from 'lib/global';
import WarningDialog from './WarningDialog';
import BottomNavi from './BottomNavi';

export default function StartButton({ disabled, href }: { disabled?: boolean; href: string }) {
	const router = useRouter();
	const [showWarning, setShowWarning] = useState(false);
	const [btDevice_smart_trainer] = useGlobalState('btDevice_smart_trainer');

	const handleOnClick = (e: React.MouseEvent<HTMLElement>) => {
		if (disabled) {
			e.preventDefault();
		} else if (!btDevice_smart_trainer) {
			e.preventDefault();
			setShowWarning(true);
		} else {
			e.preventDefault();
			router.push(href);
		}
	};

	const handleCancel = () => {
		setShowWarning(false);
	};
	const handleContinue = () => {
		setShowWarning(false);
		router.push(href);
	};

	return (
		<BottomNavi>
			<BottomNavigationAction
				sx={
					disabled
						? { color: 'lightgrey', cursor: 'not-allowed' }
						: {
								'&:hover': {
									color: 'lightgrey',
								},
							}
				}
				label="Start"
				icon={disabled ? <IconStartDisabled /> : <IconStart />}
				onClick={handleOnClick}
			/>
			<WarningDialog
				title={'Continue without a smart trainer?'}
				show={showWarning}
				handleCancel={handleCancel}
				handleContinue={handleContinue}
			>
				There is currently no connection to a smart trainer and therefore trainer control functions will not
				function.
			</WarningDialog>
		</BottomNavi>
	);
}
