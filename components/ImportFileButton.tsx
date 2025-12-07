// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import InputLabel from '@mui/material/InputLabel';
import { OverridableStringUnion } from '@mui/types';
import Button, { ButtonPropsColorOverrides } from '@mui/material/Button';
import { ChangeEvent, ReactNode, useRef } from 'react';

export default function ImportFileButton({
	children,
	onFile,
	color,
	disabled,
}: {
	children?: ReactNode | ReactNode[];
	onFile: (file: File) => void;
	color?: OverridableStringUnion<
		'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning',
		ButtonPropsColorOverrides
	>;
	disabled?: boolean;
}) {
	const uploadInputRef = useRef<HTMLInputElement | null>(null);

	const onChange = (e: ChangeEvent<HTMLInputElement>) => {
		onFile(e.target.files[0]);
	};

	return (
		<InputLabel htmlFor="import-file" hidden>
			<input
				ref={uploadInputRef}
				id="import-file"
				name="import-file"
				type="file"
				onChange={onChange}
				hidden
				disabled={disabled}
			/>
			<Button color={color || 'secondary'} variant="contained" component="span" disabled={disabled}>
				{children}
			</Button>
		</InputLabel>
	);
}
