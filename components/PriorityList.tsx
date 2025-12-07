// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'react';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import SxPropsTheme from 'lib/SxPropsTheme';

export interface ListItem {
	id: string;
	name: string;
}

const buttonStyle: SxPropsTheme = {
	margin: 0,
	marginTop: 0.5,
};

function not(a: ListItem[], b: ListItem[]) {
	return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a: ListItem[], b: ListItem[]) {
	return a.filter((value) => b.indexOf(value) !== -1);
}

export default function PriorityList({
	leftList,
	handleLeftChange,
	rightList,
	handleRightChange,
}: {
	leftList: ListItem[];
	handleLeftChange: (v: ListItem[]) => void;
	rightList: ListItem[];
	handleRightChange: (v: ListItem[]) => void;
}) {
	const [checked, setChecked] = useState<ListItem[]>([]);

	const leftChecked = intersection(checked, leftList);
	const rightChecked = intersection(checked, rightList);

	const handleToggle = (value: ListItem) => () => {
		const currentIndex = checked.indexOf(value);
		const newChecked = [...checked];

		if (currentIndex === -1) {
			newChecked.push(value);
		} else {
			newChecked.splice(currentIndex, 1);
		}

		setChecked(newChecked);
	};

	const handleAllRight = () => {
		handleRightChange(rightList.concat(leftList));
		handleLeftChange([]);
	};

	const handleCheckedRight = () => {
		handleRightChange(rightList.concat(leftChecked));
		handleLeftChange(not(leftList, leftChecked));
		setChecked(not(checked, leftChecked));
	};

	const handleCheckedLeft = () => {
		handleLeftChange(leftList.concat(rightChecked));
		handleRightChange(not(rightList, rightChecked));
		setChecked(not(checked, rightChecked));
	};

	const handleAllLeft = () => {
		handleLeftChange(leftList.concat(rightList));
		handleRightChange([]);
	};

	const customList = (items: ListItem[]) => (
		<Paper elevation={2} sx={{ width: '25ch', height: '15em', overflow: 'auto' }}>
			<List dense component="div" role="list">
				{items.map((value) => {
					const labelId = `${value.id}-label`;

					return (
						<ListItem key={value.id} role="listitem" button onClick={handleToggle(value)}>
							<ListItemIcon>
								<Checkbox
									checked={checked.indexOf(value) !== -1}
									tabIndex={-1}
									disableRipple
									inputProps={{ 'aria-labelledby': labelId }}
								/>
							</ListItemIcon>
							<ListItemText id={labelId} primary={value.name} />
						</ListItem>
					);
				})}
				<ListItem />
			</List>
		</Paper>
	);

	return (
		<Grid container spacing={2} sx={{ marginTop: '1ex' }}>
			<Grid item>{customList(leftList)}</Grid>
			<Grid item>
				<Grid container direction="column" alignItems="center">
					<Button
						variant="outlined"
						size="small"
						sx={buttonStyle}
						onClick={handleAllRight}
						disabled={leftList.length === 0}
						aria-label="move all right"
					>
						≫
					</Button>
					<Button
						variant="outlined"
						size="small"
						sx={buttonStyle}
						onClick={handleCheckedRight}
						disabled={leftChecked.length === 0}
						aria-label="move selected right"
					>
						&gt;
					</Button>
					<Button
						variant="outlined"
						size="small"
						sx={buttonStyle}
						onClick={handleCheckedLeft}
						disabled={rightChecked.length === 0}
						aria-label="move selected left"
					>
						&lt;
					</Button>
					<Button
						variant="outlined"
						size="small"
						sx={buttonStyle}
						onClick={handleAllLeft}
						disabled={rightList.length === 0}
						aria-label="move all left"
					>
						≪
					</Button>
				</Grid>
			</Grid>
			<Grid item>{customList(rightList)}</Grid>
		</Grid>
	);
}
