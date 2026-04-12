// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import type { RideEntry } from 'lib/orm';
import { smartDistanceUnitFormat } from 'lib/units';
import { useGlobalState } from 'lib/global';
import { formatDuration } from 'lib/format';
import { formatWeekLabel } from 'lib/locale';

type Logs = RideEntry[];

/** Returns the Monday (00:00:00) of the ISO week that contains `date`. */
function getISOWeekStart(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay(); // 0 = Sun
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return d;
}


interface WeekStats {
	label: string;
	activities: number;
	totalTimeMs: number;
	totalDistanceM: number;
	weekStart: Date;
}

interface ActivityStats {
	weeks: WeekStats[]; // index 0 = current week, index 3 = 3 weeks ago
	currentWeek: WeekStats;
	avgWeeklyTimeMs: number;
	avgWeeklyActivities: number;
	avgMonthlyTimeMs: number;
	avgMonthlyActivities: number;
	allTimeRides: number;
	allTimeTimeMs: number;
	allTimeDistanceM: number;
}

export function computeActivityStats(logs: Logs): ActivityStats {
	const now = new Date();
	const currentWeekStart = getISOWeekStart(now);

	// Build 4 weekly buckets (0 = current week)
	const weeks: WeekStats[] = Array.from({ length: 4 }, (_, i) => {
		const weekStart = new Date(currentWeekStart);
		weekStart.setDate(weekStart.getDate() - i * 7);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 7);

		const weekLogs = logs.filter((log) => log.ts >= weekStart.getTime() && log.ts < weekEnd.getTime());

		return {
			label: formatWeekLabel(weekStart),
			activities: weekLogs.length,
			totalTimeMs: weekLogs.reduce((sum, log) => sum + log.logger.getTotalTime(), 0),
			totalDistanceM: weekLogs.reduce((sum, log) => sum + log.logger.getTotalDistance(), 0),
			weekStart,
		};
	});

	// Avg per week over past 4 weeks (including current partial week)
	const avgWeeklyTimeMs = weeks.reduce((s, w) => s + w.totalTimeMs, 0) / 4;
	const avgWeeklyActivities = weeks.reduce((s, w) => s + w.activities, 0) / 4;

	// Avg per month: group all logs by YYYY-MM
	const monthMap = new Map<string, { timeMs: number; activities: number }>();
	for (const log of logs) {
		const d = new Date(log.ts);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const existing = monthMap.get(key) ?? { timeMs: 0, activities: 0 };
		existing.timeMs += log.logger.getTotalTime();
		existing.activities += 1;
		monthMap.set(key, existing);
	}

	const monthValues = Array.from(monthMap.values());
	const avgMonthlyTimeMs =
		monthValues.length > 0 ? monthValues.reduce((s, m) => s + m.timeMs, 0) / monthValues.length : 0;
	const avgMonthlyActivities =
		monthValues.length > 0 ? monthValues.reduce((s, m) => s + m.activities, 0) / monthValues.length : 0;

	// All-time totals
	const allTimeRides = logs.length;
	const allTimeTimeMs = logs.reduce((s, log) => s + log.logger.getTotalTime(), 0);
	const allTimeDistanceM = logs.reduce((s, log) => s + log.logger.getTotalDistance(), 0);

	return {
		weeks,
		currentWeek: weeks[0],
		avgWeeklyTimeMs,
		avgWeeklyActivities,
		avgMonthlyTimeMs,
		avgMonthlyActivities,
		allTimeRides,
		allTimeTimeMs,
		allTimeDistanceM,
	};
}

// ─── Styled components ───────────────────────────────────────────────────────

const StatRow = styled(Box)(({ theme }) => ({
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	paddingTop: theme.spacing(0.75),
	paddingBottom: theme.spacing(0.75),
}));

const BarTrack = styled(Box)(({ theme }) => ({
	height: 8,
	borderRadius: 4,
	backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
	marginTop: 4,
	overflow: 'hidden',
}));

const BarFill = styled(Box)<{ widthpct: number }>(({ theme, widthpct }) => ({
	height: '100%',
	width: `${widthpct}%`,
	borderRadius: 4,
	backgroundColor: theme.palette.primary.main,
	transition: 'width 0.4s ease',
}));

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2, lineHeight: 2 }}>
			{children}
		</Typography>
	);
}

function StatItem({ label, value }: { label: string; value: string }) {
	return (
		<StatRow>
			<Typography variant="body2" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2" fontWeight={600} color="text.primary">
				{value}
			</Typography>
		</StatRow>
	);
}

function WeekBar({ week, maxTimeMs }: { week: WeekStats; maxTimeMs: number }) {
	const pct = maxTimeMs > 0 ? (week.totalTimeMs / maxTimeMs) * 100 : 0;
	const activitiesLabel = week.activities === 1 ? '1 ride' : `${week.activities} rides`;

	return (
		<Box sx={{ mb: 1.5 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
				<Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>
					{week.label}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					{activitiesLabel}
				</Typography>
				<Typography
					variant="caption"
					fontWeight={600}
					color="text.primary"
					sx={{ minWidth: 52, textAlign: 'right' }}
				>
					{formatDuration(week.totalTimeMs)}
				</Typography>
			</Box>
			<BarTrack>
				<BarFill widthpct={pct} />
			</BarTrack>
		</Box>
	);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function RideStatsPanel({ logs }: { logs: Logs }) {
	const distanceUnit = useGlobalState('unitDistance')[0];

	if (logs.length === 0) {
		return (
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Complete your first ride to see stats here.
				</Typography>
			</Paper>
		);
	}

	const stats = computeActivityStats(logs);
	const maxTimeMs = Math.max(...stats.weeks.map((w) => w.totalTimeMs), 1);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			{/* This week */}
			<SectionLabel>This Week</SectionLabel>
			<Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
				<Box sx={{ flex: 1, textAlign: 'center' }}>
					<Typography variant="h4" fontWeight={700} color="primary">
						{stats.currentWeek.activities}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						rides
					</Typography>
				</Box>
				<Box sx={{ flex: 1, textAlign: 'center' }}>
					<Typography variant="h4" fontWeight={700} color="primary">
						{formatDuration(stats.currentWeek.totalTimeMs)}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						riding time
					</Typography>
				</Box>
			</Box>

			<Divider sx={{ my: 1.5 }} />

			{/* Past 4 weeks */}
			<SectionLabel>Past 4 Weeks</SectionLabel>
			{stats.weeks.map((week, i) => (
				<WeekBar key={i} week={week} maxTimeMs={maxTimeMs} />
			))}

			<Divider sx={{ my: 1.5 }} />

			{/* Averages */}
			<SectionLabel>Averages</SectionLabel>
			<StatItem label="Rides / week" value={stats.avgWeeklyActivities.toFixed(1)} />
			<StatItem label="Time / week" value={formatDuration(stats.avgWeeklyTimeMs)} />
			<StatItem label="Rides / month" value={stats.avgMonthlyActivities.toFixed(1)} />
			<StatItem label="Time / month" value={formatDuration(stats.avgMonthlyTimeMs)} />

			<Divider sx={{ my: 1.5 }} />

			{/* All time */}
			<SectionLabel>All Time</SectionLabel>
			<StatItem label="Total rides" value={`${stats.allTimeRides}`} />
			<StatItem label="Total time" value={formatDuration(stats.allTimeTimeMs)} />
			<StatItem label="Total distance" value={smartDistanceUnitFormat(distanceUnit, stats.allTimeDistanceM)} />
		</Paper>
	);
}
