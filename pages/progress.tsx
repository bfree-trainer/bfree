// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import { useState, useEffect } from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import { rideRepository } from 'lib/orm';
import type { RideEntry } from 'lib/orm';
import { useGlobalState } from 'lib/global';
import { chartColors, metricColors } from 'lib/tokens';

// ─── Chart color constants ────────────────────────────────────────────────────
// Primary blue shades matching MUI theme for km/distance bars
const BAR_COLOR_ACTIVE = '#1976D2'; // MUI primary.main — current month
const BAR_COLOR_PAST = '#90CAF9';   // MUI primary.light — past months
// Power metric color from design tokens
const EFFORT_COLOR_ACTIVE = metricColors.power;
const EFFORT_COLOR_PAST = '#dcedc8'; // lighter tint of metricColors.power

// TSB (Form) thresholds — based on standard TrainingPeaks/WKO conventions:
// >5 = fresh/peaking, < -10 = accumulated fatigue, in between = neutral
const TSB_FRESH_THRESHOLD = 10;
const TSB_FATIGUED_THRESHOLD = -10;

function formatDuration(ms: number): string {
	const totalMin = Math.round(ms / 60000);
	const hours = Math.floor(totalMin / 60);
	const minutes = totalMin % 60;
	if (hours === 0 && minutes === 0) return '0m';
	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}h`;
	return `${hours}h ${minutes}m`;
}

function ymdKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

// ─── Computation helpers ──────────────────────────────────────────────────────

/** Compute training load for a single activity.
 *  Prefers power-based TSS when FTP is set, falls back to HR-based TRIMP,
 *  then to a plain duration proxy. */
function activityLoad(
	entry: RideEntry,
	ftp: number,
	restHR: number,
	maxHR: number
): number {
	const laps = entry.logger.getLaps();

	// Collect all track-points
	const allPts = laps.flatMap((l) => l.trackPoints);

	// Try power-based TSS first
	const powerPts = allPts.filter(
		(p) => typeof p.power === 'number' && !isNaN(p.power) && p.power > 0
	);
	if (powerPts.length > 0 && ftp > 0) {
		const avgPower = powerPts.reduce((s, p) => s + p.power, 0) / powerPts.length;
		const durationHrs = entry.logger.getTotalTime() / 3600000;
		const IF = avgPower / ftp;
		return durationHrs * IF * IF * 100;
	}

	// Try HR-based TRIMP
	const hrPts = allPts.filter((p) => typeof p.hr === 'number' && !isNaN(p.hr) && p.hr > 0);
	if (hrPts.length > 0 && maxHR > restHR) {
		const avgHR = hrPts.reduce((s, p) => s + p.hr, 0) / hrPts.length;
		const durationMin = entry.logger.getTotalTime() / 60000;
		const hrRatio = Math.max(0, (avgHR - restHR) / (maxHR - restHR));
		return durationMin * hrRatio * Math.exp(1.92 * hrRatio);
	}

	// Fallback: 1 arbitrary unit per minute
	return entry.logger.getTotalTime() / 60000;
}

interface MonthBucket {
	month: string;  // "Jan '25"
	key: string;    // "2025-01"
	distanceM: number;
	durationMs: number;
	activities: number;
	load: number;
}

function buildMonthBuckets(
	logs: RideEntry[],
	n: number,
	ftp: number,
	restHR: number,
	maxHR: number
): MonthBucket[] {
	const now = new Date();
	const buckets: MonthBucket[] = [];

	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const label = d.toLocaleDateString(navigator.languages?.[0] ?? 'en-US', {
			month: 'short',
			year: '2-digit',
		});
		buckets.push({ month: label, key, distanceM: 0, durationMs: 0, activities: 0, load: 0 });
	}

	for (const entry of logs) {
		const d = new Date(entry.ts);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const bucket = buckets.find((b) => b.key === key);
		if (!bucket) continue;
		bucket.distanceM += entry.logger.getTotalDistance();
		bucket.durationMs += entry.logger.getTotalTime();
		bucket.activities += 1;
		bucket.load += activityLoad(entry, ftp, restHR, maxHR);
	}

	return buckets;
}

/** 42-day (CTL) and 7-day (ATL) EMA of daily training loads → fitness / form. */
function computeFitnessForm(
	logs: RideEntry[],
	ftp: number,
	restHR: number,
	maxHR: number
): { ctl: number; atl: number; tsb: number } {
	// Build a day → load map
	const dailyLoad = new Map<string, number>();
	for (const entry of logs) {
		const key = ymdKey(new Date(entry.ts));
		dailyLoad.set(key, (dailyLoad.get(key) ?? 0) + activityLoad(entry, ftp, restHR, maxHR));
	}

	const now = new Date();
	let ctl = 0;
	let atl = 0;

	for (let i = 89; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		const load = dailyLoad.get(ymdKey(d)) ?? 0;
		ctl += (load - ctl) / 42;
		atl += (load - atl) / 7;
	}

	return { ctl: Math.round(ctl), atl: Math.round(atl), tsb: Math.round(ctl - atl) };
}

/** Best average power over a sliding time window (ms) across all activities. */
function bestAveragePower(logs: RideEntry[], windowMs: number): number {
	let best = 0;

	for (const entry of logs) {
		const pts: { time: number; power: number }[] = [];
		for (const lap of entry.logger.getLaps()) {
			for (const tp of lap.trackPoints) {
				if (typeof tp.power === 'number' && !isNaN(tp.power) && tp.power > 0) {
					pts.push({ time: tp.time, power: tp.power });
				}
			}
		}
		if (pts.length < 2) continue;
		pts.sort((a, b) => a.time - b.time);

		let left = 0;
		let sum = 0;
		for (let right = 0; right < pts.length; right++) {
			sum += pts[right].power;
			while (pts[right].time - pts[left].time > windowMs) {
				sum -= pts[left++].power;
			}
			const span = pts[right].time - pts[left].time;
			const count = right - left + 1;
			// Require at least 85% of the requested window to be covered to count as
			// a valid "best effort" (guards against short rides or data gaps at the end).
			if (span >= windowMs * 0.85 && count >= 2) {
				best = Math.max(best, sum / count);
			}
		}
	}

	return Math.round(best);
}

function getMaxHR(logs: RideEntry[]): number {
	let maxHR = 0;
	for (const entry of logs) {
		for (const lap of entry.logger.getLaps()) {
			if (lap.maxHR && lap.maxHR > maxHR) maxHR = lap.maxHR;
		}
	}
	return Math.round(maxHR);
}

function getLongestRide(logs: RideEntry[]): { distanceM: number; date: string } | null {
	if (logs.length === 0) return null;
	let best = logs[0];
	for (const e of logs) {
		if (e.logger.getTotalDistance() > best.logger.getTotalDistance()) best = e;
	}
	return { distanceM: best.logger.getTotalDistance(), date: best.date };
}

function getBestAvgSpeed(logs: RideEntry[]): number {
	// m/s → displayed as km/h or mph via unitDistance later; stored as m/s
	let best = 0;
	for (const e of logs) {
		const dist = e.logger.getTotalDistance();
		const time = e.logger.getTotalTime();
		if (dist > 0 && time > 0) {
			const avgSpeedMs = dist / (time / 1000);
			if (avgSpeedMs > best) best = avgSpeedMs;
		}
	}
	return best; // m/s
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Card variant="outlined" sx={{ mb: 0 }}>
			<CardHeader
				title={title}
				titleTypographyProps={{ variant: 'overline', color: 'text.secondary', letterSpacing: 1.4 }}
				sx={{ pb: 0 }}
			/>
			<CardContent sx={{ pt: 1 }}>{children}</CardContent>
		</Card>
	);
}

function StatBox({
	label,
	value,
	sub,
}: {
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<Box sx={{ textAlign: 'center', px: 1 }}>
			<Typography variant="h5" fontWeight={700} color="primary.main">
				{value}
			</Typography>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			{sub && (
				<Typography variant="caption" color="text.secondary" display="block">
					{sub}
				</Typography>
			)}
		</Box>
	);
}

function DeltaChip({ current, previous }: { current: number; previous: number }) {
	if (previous === 0 && current === 0)
		return (
			<Chip
				size="small"
				icon={<RemoveIcon fontSize="small" />}
				label="—"
				variant="outlined"
				sx={{ ml: 1 }}
			/>
		);
	if (previous === 0)
		return (
			<Chip
				size="small"
				icon={<ArrowUpwardIcon fontSize="small" />}
				label="new"
				color="success"
				variant="outlined"
				sx={{ ml: 1 }}
			/>
		);
	const pct = ((current - previous) / previous) * 100;
	const abs = Math.abs(Math.round(pct));
	if (abs < 1)
		return (
			<Chip
				size="small"
				icon={<RemoveIcon fontSize="small" />}
				label="—"
				variant="outlined"
				sx={{ ml: 1 }}
			/>
		);
	const up = current >= previous;
	return (
		<Chip
			size="small"
			icon={up ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
			label={`${abs}%`}
			color={up ? 'success' : 'default'}
			variant="outlined"
			sx={{ ml: 1 }}
		/>
	);
}

function BestEffortRow({ label, value }: { label: string; value: string }) {
	return (
		<Box
			sx={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				py: 0.75,
			}}
		>
			<Typography variant="body2" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2" fontWeight={600} color="text.primary">
				{value}
			</Typography>
		</Box>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Progress() {
	const [logs, setLogs] = useState<RideEntry[]>([]);
	const [loaded, setLoaded] = useState(false);

	// Load from localStorage on client only (avoids server/client hydration mismatch)
	useEffect(() => {
		setLogs(rideRepository.findAll());
		setLoaded(true);
	}, []);
	const [unitDistance] = useGlobalState('unitDistance');
	const [{ ftp, heartRate: { rest: restHR, max: maxHR } }] = useGlobalState('rider');

	const isKm = unitDistance === 'km';
	const isMi = unitDistance === 'mi';
	const distConvFactor = isKm ? 0.001 : isMi ? 0.000621 : 1;
	const distLabel = isKm ? 'km' : isMi ? 'mi' : 'm';
	const speedFactor = isKm ? 3.6 : isMi ? 2.237 : 1;
	const speedLabel = isKm ? 'km/h' : isMi ? 'mph' : 'm/s';

	const fmt = (m: number, dp = 1) => (m * distConvFactor).toFixed(dp);

	// Build 12-month buckets for bar chart
	const monthBuckets = logs.length > 0
		? buildMonthBuckets(logs, 12, ftp, restHR, maxHR)
		: [];

	// Current and previous month
	const currentMonth = monthBuckets[monthBuckets.length - 1];
	const previousMonth = monthBuckets[monthBuckets.length - 2];

	// Fitness / form
	const { ctl, atl, tsb } = logs.length > 0
		? computeFitnessForm(logs, ftp, restHR, maxHR)
		: { ctl: 0, atl: 0, tsb: 0 };

	// Best efforts
	const power5min = bestAveragePower(logs, 5 * 60 * 1000);
	const power20min = bestAveragePower(logs, 20 * 60 * 1000);
	const power60min = bestAveragePower(logs, 60 * 60 * 1000);
	const maxHRRecorded = getMaxHR(logs);
	const longest = getLongestRide(logs);
	const bestSpeedMs = getBestAvgSpeed(logs);

	const hasNoBestEfforts =
		power5min === 0 &&
		power20min === 0 &&
		power60min === 0 &&
		maxHRRecorded === 0 &&
		(!longest || longest.distanceM === 0);

	// All-time totals
	const allTimeRides = logs.length;
	const allTimeMs = logs.reduce((s, l) => s + l.logger.getTotalTime(), 0);
	const allTimeM = logs.reduce((s, l) => s + l.logger.getTotalDistance(), 0);

	// Bar chart data
	const chartData = monthBuckets.map((b) => ({
		month: b.month,
		dist: parseFloat((b.distanceM * distConvFactor).toFixed(1)),
		effort: parseFloat(b.load.toFixed(1)),
	}));

	if (!loaded) {
		return (
			<Container maxWidth="md">
				<MyHead title="Progress" />
				<Title href="/">Progress</Title>
				<Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
					<CircularProgress />
				</Box>
			</Container>
		);
	}

	if (logs.length === 0) {
		return (
			<Container maxWidth="md">
				<MyHead title="Progress" />
				<Title href="/">Progress</Title>
				<Box sx={{ mt: 4, textAlign: 'center' }}>
					<Typography variant="h6" color="text.secondary">
						Complete your first ride to see progress here.
					</Typography>
				</Box>
			</Container>
		);
	}

	return (
		<Container maxWidth="md">
			<MyHead title="Progress" />
			<Title href="/">Progress</Title>

			{/* All-time summary */}
			<Paper
				variant="outlined"
				sx={{
					display: 'flex',
					justifyContent: 'space-around',
					py: 2,
					mb: 2,
				}}
			>
				<StatBox label="Total Rides" value={`${allTimeRides}`} />
				<Divider orientation="vertical" flexItem />
				<StatBox
					label={`Total ${distLabel}`}
					value={fmt(allTimeM, allTimeM * distConvFactor >= 1000 ? 0 : 1)}
				/>
				<Divider orientation="vertical" flexItem />
				<StatBox label="Total Time" value={formatDuration(allTimeMs)} />
			</Paper>

			<Grid container spacing={2}>
				{/* Monthly km bar chart */}
				<Grid item xs={12}>
					<SectionCard title={`${distLabel.toUpperCase()} per Month`}>
						<Box sx={{ width: '100%', height: 220 }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="month"
										tick={{ fontSize: 11, fill: chartColors.tickLabel }}
										angle={-45}
										textAnchor="end"
										interval={0}
									/>
									<YAxis
										tick={{ fontSize: 11, fill: chartColors.tickLabel }}
										tickFormatter={(v) => `${v}`}
										width={36}
									/>
									<Tooltip
										formatter={(val: number) => [`${val} ${distLabel}`, distLabel]}
										labelStyle={{ fontWeight: 600 }}
									/>
									<Bar dataKey="dist" radius={[3, 3, 0, 0]} maxBarSize={40}>
										{chartData.map((entry, idx) => (
											<Cell
												key={`km-${idx}`}
												fill={entry.month === currentMonth?.month ? BAR_COLOR_ACTIVE : BAR_COLOR_PAST}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</Box>
					</SectionCard>
				</Grid>

				{/* Monthly comparison */}
				<Grid item xs={12} sm={6}>
					<SectionCard title="This Month">
						<Box sx={{ display: 'flex', alignItems: 'baseline', mb: 0.5 }}>
							<Typography variant="h4" fontWeight={700} color="primary.main">
								{fmt(currentMonth?.distanceM ?? 0)}
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ ml: 0.75, mr: 1 }}>
								{distLabel}
							</Typography>
							<DeltaChip
								current={currentMonth?.distanceM ?? 0}
								previous={previousMonth?.distanceM ?? 0}
							/>
						</Box>
						<Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
							<Box>
								<Typography variant="body1" fontWeight={600}>
									{formatDuration(currentMonth?.durationMs ?? 0)}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									riding time
								</Typography>
							</Box>
							<Box>
								<Box sx={{ display: 'flex', alignItems: 'center' }}>
									<Typography variant="body1" fontWeight={600}>
										{currentMonth?.activities ?? 0}
									</Typography>
									<DeltaChip
										current={currentMonth?.activities ?? 0}
										previous={previousMonth?.activities ?? 0}
									/>
								</Box>
								<Typography variant="caption" color="text.secondary">
									rides
								</Typography>
							</Box>
						</Box>
					</SectionCard>
				</Grid>

				<Grid item xs={12} sm={6}>
					<SectionCard title="Last Month">
						<Box sx={{ display: 'flex', alignItems: 'baseline', mb: 0.5 }}>
							<Typography variant="h4" fontWeight={700}>
								{fmt(previousMonth?.distanceM ?? 0)}
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
								{distLabel}
							</Typography>
						</Box>
						<Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
							<Box>
								<Typography variant="body1" fontWeight={600}>
									{formatDuration(previousMonth?.durationMs ?? 0)}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									riding time
								</Typography>
							</Box>
							<Box>
								<Typography variant="body1" fontWeight={600}>
									{previousMonth?.activities ?? 0}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									rides
								</Typography>
							</Box>
						</Box>
					</SectionCard>
				</Grid>

				{/* Relative effort bar chart */}
				<Grid item xs={12}>
					<SectionCard title="Relative Effort (past 12 months)">
						<Box sx={{ width: '100%', height: 180 }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="month"
										tick={{ fontSize: 11, fill: chartColors.tickLabel }}
										angle={-45}
										textAnchor="end"
										interval={0}
									/>
									<YAxis tick={{ fontSize: 11, fill: chartColors.tickLabel }} width={36} />
									<Tooltip
										formatter={(val: number) => [val.toFixed(0), 'Effort']}
										labelStyle={{ fontWeight: 600 }}
									/>
									<Bar dataKey="effort" radius={[3, 3, 0, 0]} maxBarSize={40}>
										{chartData.map((entry, idx) => (
											<Cell
												key={`effort-${idx}`}
												fill={entry.month === currentMonth?.month ? EFFORT_COLOR_ACTIVE : EFFORT_COLOR_PAST}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</Box>
						<Typography variant="caption" color="text.secondary">
							{ftp > 0
								? 'Training Stress Score (TSS) based on power data when available, otherwise HR-based TRIMP.'
								: 'HR-based TRIMP. Set your FTP in Setup → Rider for power-based TSS.'}
						</Typography>
					</SectionCard>
				</Grid>

				{/* Fitness & Form */}
				<Grid item xs={12} sm={4}>
					<SectionCard title="Fitness">
						<Typography variant="h3" fontWeight={700} color="primary.main">
							{ctl}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Chronic Training Load (42-day)
						</Typography>
					</SectionCard>
				</Grid>

				<Grid item xs={12} sm={4}>
					<SectionCard title="Fatigue">
						<Typography variant="h3" fontWeight={700} color="error.main">
							{atl}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Acute Training Load (7-day)
						</Typography>
					</SectionCard>
				</Grid>

				<Grid item xs={12} sm={4}>
					<SectionCard title="Form">
						<Typography
							variant="h3"
							fontWeight={700}
							color={tsb > TSB_FRESH_THRESHOLD ? 'success.main' : tsb < TSB_FATIGUED_THRESHOLD ? 'error.main' : 'text.primary'}
						>
							{tsb > 0 ? `+${tsb}` : `${tsb}`}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{tsb > TSB_FRESH_THRESHOLD
								? 'Fresh — good form'
								: tsb < TSB_FATIGUED_THRESHOLD
									? 'Fatigued — consider recovery'
									: 'Neutral'}
						</Typography>
					</SectionCard>
				</Grid>

				{/* Best Efforts */}
				<Grid item xs={12}>
					<SectionCard title="Best Efforts">
						{power5min > 0 && (
							<BestEffortRow label="5-min Power" value={`${power5min} W`} />
						)}
						{power20min > 0 && (
							<>
								<Divider />
								<BestEffortRow label="20-min Power" value={`${power20min} W`} />
							</>
						)}
						{power60min > 0 && (
							<>
								<Divider />
								<BestEffortRow label="60-min Power" value={`${power60min} W`} />
							</>
						)}
						{maxHRRecorded > 0 && (
							<>
								{(power5min > 0 || power20min > 0 || power60min > 0) && <Divider />}
								<BestEffortRow label="Max Heart Rate" value={`${maxHRRecorded} bpm`} />
							</>
						)}
						{longest && longest.distanceM > 0 && (
							<>
								<Divider />
								<BestEffortRow
									label="Longest Ride"
									value={`${fmt(longest.distanceM)} ${distLabel}`}
								/>
							</>
						)}
						{bestSpeedMs > 0 && (
							<>
								<Divider />
								<BestEffortRow
									label={`Best Avg Speed`}
									value={`${(bestSpeedMs * speedFactor).toFixed(1)} ${speedLabel}`}
								/>
							</>
						)}
						{hasNoBestEfforts && (
							<Typography variant="body2" color="text.secondary">
								No best-effort data available yet.
							</Typography>
						)}
					</SectionCard>
				</Grid>
			</Grid>

			<Box sx={{ height: 24 }} />
		</Container>
	);
}
