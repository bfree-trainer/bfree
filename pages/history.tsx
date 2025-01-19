import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import IconDelete from '@mui/icons-material/Delete';
import IconDownload from '@mui/icons-material/GetApp';
import IconMoreVert from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { red } from '@mui/material/colors';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, MutableRefObject } from 'react';
import BottomNavi from '../components/BottomNavi';
import MyHead from '../components/MyHead';
import Title from '../components/Title';
import EditRideModal from '../components/EditRideModal';
import downloadBlob from '../lib/download_blob';
import { deleteActivityLog, getActivityLogs } from '../lib/activity_log';

const PREFIX = 'history';
const classes = {
	cardRoot: `${PREFIX}-cardRoot`,
	fab: `${PREFIX}-fab`,
	media: `${PREFIX}-media`,
	expand: `${PREFIX}-expand`,
	expandOpen: `${PREFIX}-expandOpen`,
	avatar: `${PREFIX}-avatar`,
};

const StyledContainer = styled(Container)(({ theme }) => ({
	[`& .${classes.cardRoot}`]: {
		minWidth: 345,
		maxWidth: 345,
	},

	[`& .${classes.fab}`]: {
		display: 'flex',
		marginLeft: 'auto',
		marginRight: 'auto',
		marginBottom: '2em',
		marginTop: '2em',
	},

	[`& .${classes.media}`]: {
		height: 0,
		paddingTop: '56.25%', // 16:9
	},

	[`& .${classes.expand}`]: {
		transform: 'rotate(0deg)',
		marginLeft: 'auto',
		transition: theme.transitions.create('transform', {
			duration: theme.transitions.duration.shortest,
		}),
	},

	[`& .${classes.expandOpen}`]: {
		transform: 'rotate(180deg)',
	},

	[`& .${classes.avatar}`]: {
		backgroundColor: red[500],
	},
}));

type Log = ReturnType<typeof getActivityLogs>[1];

function RideCard({ log, onChange, onSelect }: { log: Log; onChange: () => void; onSelect: (v: boolean) => void }) {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const name = log.logger.getName();
	const notes = log.logger.getNotes();

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};
	const handleEdit = () => {
		setAnchorEl(null);
		setShowEditModal(true);
	};
	const handleDownload = () => {
		const { logger } = log;
		const filename = `${logger.getStartTimeISO().slice(0, 10)}_${logger.getName()}.tcx`;
		const xmlLines: string[] = [];

		logger.tcx((line: string) => xmlLines.push(line));
		const blob = new Blob(xmlLines, { type: 'application/vnd.garmin.tcx+xml' });

		downloadBlob(blob, filename);
	};

	return (
		<Grid item xs={10}>
			<Card variant="outlined" className={classes.cardRoot}>
				<CardHeader
					avatar={
						<Avatar aria-label="recipe" className={classes.avatar}>
							{log.logger.getAvatar()}
						</Avatar>
					}
					action={
						<div>
							<IconButton aria-label="settings" onClick={handleMenuClick} size="large">
								<IconMoreVert />
							</IconButton>
							<Menu
								id={`edit-menu-${log.id}`}
								anchorEl={anchorEl}
								keepMounted
								open={!!anchorEl}
								onClose={handleClose}
							>
								<MenuItem onClick={handleEdit}>Edit</MenuItem>
							</Menu>
						</div>
					}
					title={name}
					subheader={log.date}
				/>
				{/* Add preview here */}
				<CardContent>
					<Typography variant="body2" color="textSecondary" component="p">
						{notes}
					</Typography>
				</CardContent>
				<CardActions disableSpacing>
					<IconButton aria-label="download" onClick={handleDownload} size="large">
						<IconDownload />
					</IconButton>
					<Checkbox
						color="default"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelect(e.target.checked)}
					/>
				</CardActions>
			</Card>
			<EditRideModal open={showEditModal} onClose={() => setShowEditModal(false)} logger={log.logger} />
		</Grid>
	);
}

export default function History() {
	const router = useRouter();
	const isBreakpoint = useMediaQuery('(min-width:800px)');
	const [logs, setLogs] = useState<ReturnType<typeof getActivityLogs>>([]);
	const selectionRef = useRef(new WeakMap<Log, Boolean>());
	const [selectionCount, setSelectionCount] = useState(0);
	const handleChange = () => {
		setLogs(getActivityLogs());
	};
	const massDeletion = () => {
		const q = logs.filter((log) => selectionRef.current.has(log));
		setSelectionCount(selectionCount - q.length); // RFE Will this go out of sync if deletion fails?
		q.forEach(({ id }) => {
			deleteActivityLog(id);
		});
		handleChange();
	};

	useEffect(() => {
		handleChange();
		setSelectionCount(logs.reduce((acc, cur) => acc + +selectionRef.current.has(cur), 0));
	}, [logs]);

	return (
		<StyledContainer maxWidth="md">
			<MyHead title="Previous Rides" />
			<Box>
				<Title href="/">{isBreakpoint ? 'Previous Rides' : 'Rides'}</Title>
				<p>Manage and export previous rides.</p>

				<Grid container direction="column" alignItems="center" spacing={2}>
					{logs.map((log) => (
						<RideCard
							log={log}
							onChange={handleChange}
							onSelect={(v: boolean) => {
								if (v) {
									selectionRef.current.set(log, true);
									setSelectionCount(selectionCount + 1);
								} else {
									selectionRef.current.delete(log);
									setSelectionCount(selectionCount - 1);
								}
							}}
							key={log.id}
						/>
					))}
				</Grid>
			</Box>
			<BottomNavi>
				<BottomNavigationAction
					sx={
						selectionCount === 0
							? { color: 'lightgrey', cursor: 'not-allowed' }
							: {
									'&:hover': {
										color: 'lightgrey',
									},
							  }
					}
					label="Delete"
					icon={
						<Badge badgeContent={selectionCount} color="error">
							<IconDelete />
						</Badge>
					}
					onClick={(e) => {
						e.preventDefault();
						{
							if (selectionCount > 0) massDeletion();
						}
					}}
				/>
			</BottomNavi>
		</StyledContainer>
	);
}
