import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconCadence from '@mui/icons-material/FlipCameraAndroid';
import IconHeart from '@mui/icons-material/Favorite';
import IconPower from '@mui/icons-material/OfflineBolt';
import IconSpeed from '@mui/icons-material/Speed';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled } from '@mui/material/styles';
import { Measurement, CscMeasurements, HrmMeasurements, useMeasurementByType } from '../../lib/measurements';
import SxPropsTheme from '../../lib/SxPropsTheme';
import { ReactElement, useState, useEffect, useMemo } from 'react';
import { UnitConv, speedUnitConv } from '../../lib/units';
import { getGlobalState, useGlobalState } from '../../lib/global';

const PREFIX = 'MeasurementCard';

const classes = {
	cardHeader: `${PREFIX}-cardHeader`,
	card: `${PREFIX}-card`,
	valuesTable: `${PREFIX}-valuesTable`,
	header: `${PREFIX}-header`,
	value: `${PREFIX}-value`,
	unit: `${PREFIX}-unit`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
	[`& .${classes.cardHeader}`]: {
		padding: 2,
	},

	[`& .${classes.card}`]: {
		height: '10em',
	},

	[`& .${classes.valuesTable}`]: {
		border: 0,
		width: '100%',
		borderCollapse: 'collapse',
		borderSpacing: 0,
		borderWidth: 0,
	},

	[`& .${classes.header}`]: {
		textAlign: 'left',
		fontWeight: 'bold',
	},

	[`& .${classes.value}`]: {
		width: '10em',
		textAlign: 'right',
	},

	[`& .${classes.unit}`]: {
		textAlign: 'left',
	},
}));

type DisplayValue = {
	value: number;
	unit: string;
};

export {};

const iconStyle: SxPropsTheme = {
	fontSize: '18px !important',
};

function getContentByType(classes, minimal: boolean, speedUnit: UnitConv[''], type: Measurement) {
	/* eslint-disable react/jsx-key */
	const contentByType: { [K in Measurement]: [ReactElement, (m: any) => DisplayValue, number] } = {
		cycling_cadence: [
			<span>
				<IconCadence sx={iconStyle} /> {minimal ? '' : 'Cadence'}
			</span>,
			(m: CscMeasurements) => ({ value: m ? m.cadence : NaN, unit: 'RPM' }),
			0,
		],
		cycling_power: [
			<span>
				<IconPower sx={iconStyle} /> {minimal ? '' : 'Power'}
			</span>,
			(m: any) => ({ value: m ? m.power : NaN, unit: 'W' }),
			0,
		],
		cycling_speed: [
			<span>
				<IconSpeed sx={iconStyle} /> {minimal ? '' : 'Speed'}
			</span>,
			(m: CscMeasurements) => ({ value: m && m.speed ? speedUnit.convTo(m.speed) : NaN, unit: speedUnit.name }),
			1,
		],
		heart_rate: [
			<span>
				<IconHeart sx={iconStyle} /> {minimal ? '' : 'Heart Rate'}
			</span>,
			(m: HrmMeasurements) => ({ value: m ? m.heartRate : NaN, unit: 'BPM' }),
			1,
		],
	};
	/* eslint-enable react/jsx-key */

	return contentByType[type];
}

export default function MeasurementCard({ type, ribbonColor }: { type: Measurement; ribbonColor?: string }) {
	const isBreakpoint = useMediaQuery('(min-width:800px)');
	const speedUnit = speedUnitConv[useGlobalState('unitSpeed')[0]];
	const [title, fn, digits] = useMemo(
		() => getContentByType(classes, !isBreakpoint, speedUnit, type),
		[isBreakpoint, speedUnit, type]
	);
	const m = useMeasurementByType(type);
	const limitMax = useGlobalState('rider')[0].heartRate.max; // TODO Avoid having this for every meas
	const { value, unit } = fn(m);
	const [{ avg, max }, setAgg] = useState({ avg: 0, max: NaN, n: 0 });

	useEffect(() => {
		const { value: v } = fn(m);

		setAgg((prev) => {
			const newValue = { ...prev };

			// RFE Sometimes avg goes NaN, this should sort of fix it.
			// Issue #49
			if (Number.isNaN(prev.avg) || prev.avg === Infinity) {
				newValue.avg = 0;
				newValue.n = 0;
			} else if (!Number.isNaN(v)) {
				newValue.avg = prev.avg + (v - prev.avg) / (prev.n + 1);
				newValue.n++;
			}

			if (Number.isNaN(prev.max) || (v > prev.max && v < Infinity)) {
				newValue.max = v;
			}

			return newValue;
		});
	}, [fn, m, setAgg]);

	return (
		<StyledGrid item xs={4}>
			<Card
				variant="outlined"
				sx={
					type === 'heart_rate' && value > limitMax // TODO Could be more generic
						? {
								animation: 'blinker 1s linear infinite',
								'@keyframes blinker': {
									'50%': {
										backgroundColor: '#ffaeae', // TODO ribbonColor should be passed as a string
									},
								},
						  }
						: undefined
				}
			>
				<CardHeader className={`${classes.cardHeader} ${ribbonColor || ''}`} />
				<CardContent className={classes.card}>
					<Typography gutterBottom variant="h5" component="h2">
						{title}
					</Typography>
					<Container>
						<table className={classes.valuesTable}>
							<tbody>
								<tr>
									<th className={classes.header}>Current:</th>
									<td className={classes.value}>
										{Number.isNaN(value) ? '--' : value.toFixed(digits)}
									</td>
									<td className={classes.unit}>{unit}</td>
								</tr>
								<tr>
									<th className={classes.header}>Avg:</th>
									<td className={classes.value}>{avg.toFixed(digits)}</td>
									<td className={classes.unit}></td>
								</tr>
								<tr>
									<th className={classes.header}>Max:</th>
									<td className={classes.value}>{Number.isNaN(max) ? '--' : max.toFixed(digits)}</td>
									<td className={classes.unit}></td>
								</tr>
							</tbody>
						</table>
					</Container>
				</CardContent>
			</Card>
		</StyledGrid>
	);
}
