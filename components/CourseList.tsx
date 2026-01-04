// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import IconDelete from '@mui/icons-material/Delete';
import AutoSizer, { Size } from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { PersistedCourse, deleteCourse, getCourses } from 'lib/course_storage';

function renderRow(props: ListChildComponentProps) {
	const { data, index, style } = props;
	const course = data.courses[index];

	const deleteThis = () => {
		if (course) {
			deleteCourse(course.id);
			data.setLastDel(Date.now());
		}
	};

	return (
		<ListItem
			style={style}
			key={index}
			component="div"
			disablePadding
			secondaryAction={
				<IconButton edge="end" aria-label="delete" onClick={deleteThis}>
					<IconDelete />
				</IconButton>
			}
		>
			<ListItemButton
				onClick={() => {
					if (course) data.onSelectCourse(course);
				}}
			>
				<ListItemText primary={course?.name || '<Load error>'} />
			</ListItemButton>
		</ListItem>
	);
}

export default function CourseList({
	height,
	changeId,
	onSelectCourse,
}: {
	height: string;
	changeId: number;
	onSelectCourse: (persistedCourse: PersistedCourse) => void;
}) {
	const [lastDel, setLastDel] = useState(0);
	const courses = useMemo(() => getCourses(), [lastDel, changeId]);

	return (
		<Box sx={{ width: '100%', height, maxWidth: 360, bgcolor: 'background.paper' }}>
			<AutoSizer>
				{(size: Size) => (
					<FixedSizeList
						height={size.height}
						width={size.width}
						itemSize={46}
						itemCount={courses.length}
						overscanCount={5}
						itemData={{ courses, setLastDel, onSelectCourse }}
					>
						{renderRow}
					</FixedSizeList>
				)}
			</AutoSizer>
		</Box>
	);
}
