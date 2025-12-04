import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

const PREFIX = 'ResistanceCard';

const classes = {
	setupCard: `${PREFIX}-setupCard`,
	media: `${PREFIX}-media`,
	formControl: `${PREFIX}-formControl`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.setupCard}`]: {
		height: '15em',
	},

	[`& .${classes.media}`]: {
		height: 120,
	},

	[`& .${classes.formControl}`]: {
		'& > *': {
			width: '25ch',
		},
	},
}));

export default function ResistanceCard({
	title,
	image,
	children,
}: {
	title: string;
	image: string;
	children: ReactNode;
}) {
	return (
		<StyledGrid item>
			<Card variant="outlined">
				<CardMedia className={classes.media} image={image} title="Filler image" />
				<Typography gutterBottom variant="h5" component="h2">
					{title}
				</Typography>
				<CardContent className={classes.setupCard}>
					<FormControl className={classes.formControl}>
						{children}
					</FormControl>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
