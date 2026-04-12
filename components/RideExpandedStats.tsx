// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { createActivityLog } from 'lib/activity_log';
import { useGlobalState } from 'lib/global';
import { speedUnitConv } from 'lib/units';
import { computeRideStats, ZoneResult } from 'lib/ride_stats';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format seconds as "m:ss" (e.g. 75 → "1:15"). */
function formatSecs(s: number): string {
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Styled sub-components ─────────────────────────────────────────────────────

const SectionLabel = styled(Typography)(({ theme }) => ({
	fontSize: '0.65rem',
	fontWeight: 700,
	letterSpacing: '0.08em',
	textTransform: 'uppercase' as const,
	color: theme.palette.text.secondary,
	marginTop: theme.spacing(1.5),
	marginBottom: theme.spacing(0.5),
	display: 'block',
}));

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
	return (
		<Box sx={{ flex: '0 0 33.33%', minWidth: 72, p: 0.5 }}>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			<Typography variant="body2" fontWeight={600}>
				{value}
			</Typography>
		</Box>
	);
}

function ZoneBar({ zones }: { zones: ZoneResult[] }) {
	const totalSecs = zones.reduce((s, z) => s + z.seconds, 0);
	if (totalSecs === 0) return null;

	return (
		<Box>
			{/* Stacked overview bar */}
			<Tooltip
				title={zones
					.filter((z) => z.seconds > 0)
					.map((z) => `${z.name} ${z.label}: ${formatSecs(z.seconds)}`)
					.join(' · ')}
				placement="top"
			>
				<Box
					aria-label="zone distribution"
					sx={{ display: 'flex', height: 10, borderRadius: 1, overflow: 'hidden', mb: 1, cursor: 'default' }}
				>
					{zones.map((zone) =>
						zone.seconds > 0 ? (
							<Box
								key={zone.name}
								sx={{
									width: `${zone.pct}%`,
									backgroundColor: zone.color,
								}}
							/>
						) : null
					)}
				</Box>
			</Tooltip>

			{/* Per-zone rows */}
			{zones.map((zone) => (
				<Box key={zone.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
					<Box
						sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: zone.color, flexShrink: 0 }}
						aria-hidden="true"
					/>
					<Typography variant="caption" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>
						{zone.name} {zone.label}
					</Typography>
					<Box
						role="progressbar"
						aria-valuenow={Math.round(zone.pct)}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label={`${zone.name} ${zone.pct.toFixed(0)}%`}
						sx={{ flex: 1, height: 6, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}
					>
						<Box
							sx={{
								height: '100%',
								width: `${zone.pct}%`,
								bgcolor: zone.color,
								borderRadius: 1,
								transition: 'width 0.3s ease',
								'@media (prefers-reduced-motion: reduce)': { transition: 'none' },
							}}
						/>
					</Box>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ minWidth: 30, textAlign: 'right', flexShrink: 0 }}
					>
						{formatSecs(zone.seconds)}
					</Typography>
				</Box>
			))}
		</Box>
	);
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function RideExpandedStats({ logger }: { logger: ReturnType<typeof createActivityLog> }) {
	const [rider] = useGlobalState('rider');
	const [bike] = useGlobalState('bike');
	const [unitSpeed] = useGlobalState('unitSpeed');
	const speedUnit = speedUnitConv[unitSpeed];

	const stats = computeRideStats(logger, rider, bike.weight);

	const hasPower = stats.avgPower !== null;
	const hasEstimatedPower = !hasPower && stats.estimatedAvgPower !== null;
	const hasHR = stats.avgHR !== null;
	const hasSpeed = stats.avgSpeed !== null;
	const hasElevation = stats.totalAscent !== null;
	const hasTemp = stats.avgTemp !== null;
	const hasRelativeEffort = stats.relativeEffort !== null && stats.relativeEffort > 0;
	const hasPowerZones = stats.powerZones !== null;
	const hasHRZones = stats.hrZones !== null;

	const hasAnyStats = hasPower || hasEstimatedPower || hasHR || hasSpeed || hasElevation || hasTemp;
	if (!hasAnyStats && !hasRelativeEffort && !hasPowerZones && !hasHRZones) {
		return null;
	}

	return (
		<Box sx={{ mt: 1 }}>
			<Divider sx={{ mb: 1 }} />

			{/* ── Relative Effort ─────────────────────────────────────────── */}
			{hasRelativeEffort && (
				<Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
					<Typography variant="body2" color="text.secondary">
						Relative Effort
					</Typography>
					<Typography variant="h5" fontWeight={700} color="primary" component="span">
						{stats.relativeEffort}
					</Typography>
				</Box>
			)}

			{/* ── Key stats ────────────────────────────────────────────────── */}

			{hasSpeed && (
				<>
					<SectionLabel>Speed</SectionLabel>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
						<StatCell
							label="Avg"
							value={`${speedUnit.convTo(stats.avgSpeed!).toFixed(1)} ${speedUnit.name}`}
						/>
						<StatCell
							label="Max"
							value={`${speedUnit.convTo(stats.maxSpeed!).toFixed(1)} ${speedUnit.name}`}
						/>
					</Box>
				</>
			)}

			{hasElevation && (
				<>
					<SectionLabel>Elevation</SectionLabel>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
						<StatCell label="Ascent" value={`${stats.totalAscent!.toFixed(0)} m`} />
						<StatCell label="Descent" value={`${stats.totalDescent!.toFixed(0)} m`} />
						<StatCell label="Max" value={`${stats.maxElevation!.toFixed(0)} m`} />
					</Box>
				</>
			)}

			{hasPower && (
				<>
					<SectionLabel>Power</SectionLabel>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
						<StatCell label="Avg" value={`${stats.avgPower} W`} />
						<StatCell label="Max" value={`${stats.maxPower} W`} />
						{stats.normalizedPower !== null && <StatCell label="Norm" value={`${stats.normalizedPower} W`} />}
					</Box>
				</>
			)}

			{hasEstimatedPower && (
				<>
					<SectionLabel>Estimated Power</SectionLabel>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
						<StatCell label="Avg" value={`${stats.estimatedAvgPower} W`} />
						<StatCell label="Max" value={`${stats.estimatedMaxPower} W`} />
						{stats.estimatedNormalizedPower !== null && (
							<StatCell label="Norm" value={`${stats.estimatedNormalizedPower} W`} />
						)}
					</Box>
				</>
			)}

			{hasHR && (
				<>
					<SectionLabel>Heart Rate</SectionLabel>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
						<StatCell label="Min" value={`${stats.minHR} bpm`} />
						<StatCell label="Avg" value={`${stats.avgHR} bpm`} />
						<StatCell label="Max" value={`${stats.maxHR} bpm`} />
					</Box>
				</>
			)}

			{hasTemp && (
				<>
					<SectionLabel>Temperature</SectionLabel>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
						<StatCell label="Min" value={`${stats.minTemp} °C`} />
						<StatCell label="Avg" value={`${stats.avgTemp} °C`} />
						<StatCell label="Max" value={`${stats.maxTemp} °C`} />
					</Box>
				</>
			)}

			{/* ── Zone breakdowns ──────────────────────────────────────────── */}
			{hasPowerZones && (
				<>
					<SectionLabel>Power Zones</SectionLabel>
					<ZoneBar zones={stats.powerZones!} />
				</>
			)}

			{hasHRZones && (
				<>
					<SectionLabel>Heart Rate Zones</SectionLabel>
					<ZoneBar zones={stats.hrZones!} />
				</>
			)}
		</Box>
	);
}
