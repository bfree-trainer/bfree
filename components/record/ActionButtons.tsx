import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import IconPause from '@mui/icons-material/Pause';
import IconSplit from '@mui/icons-material/Timer';
import IconStop from '@mui/icons-material/Stop';
import BottomNavi from 'components/BottomNavi';

const buttonStyle = {
	'&:hover': {
		color: 'lightgrey',
	},
};

export function RecordActionButtons({
	onClickPause,
	onClickSplit,
	onClickEnd,
}: {
	onClickPause: (e?: React.MouseEvent<HTMLElement>) => void;
	onClickSplit: (e?: React.MouseEvent<HTMLElement>) => void;
	onClickEnd: (e?: React.MouseEvent<HTMLElement>) => void;
}) {
	return (
		<BottomNavi>
			<BottomNavigationAction sx={buttonStyle} label="Pause" icon={<IconPause />} onClick={onClickPause} />
			<BottomNavigationAction sx={buttonStyle} label="Split" icon={<IconSplit />} onClick={onClickSplit} />
			<BottomNavigationAction sx={buttonStyle} label="End" icon={<IconStop />} onClick={onClickEnd} />
		</BottomNavi>
	);
}
