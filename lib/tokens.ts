// SPDX-FileCopyrightText: 2026 Bfree contributors
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Design tokens for the Bfree application.
 *
 * Centralizes hardcoded values used across components so they can be
 * maintained in one place and consumed consistently.
 */

// ---------------------------------------------------------------------------
// Metric colors — used in charts, cards, and ribbon headers
// ---------------------------------------------------------------------------
export const metricColors = {
	heartRate: '#ffaeae',
	power: '#b1e67b',
	speed: '#57baeb',
	elevation: '#8884d8',
} as const;

// ---------------------------------------------------------------------------
// Route / map colors — used in map markers, polylines, and route planning
// ---------------------------------------------------------------------------
export const routeColors = {
	/** Start waypoint (matches MUI success.main) */
	start: '#4CAF50',
	/** End waypoint (matches MUI error.main) */
	end: '#f44336',
	/** Via / intermediate waypoint (matches MUI primary.main) */
	via: '#1976D2',
	/** Route polyline */
	routeLine: '#1976D2',
	/** Course segment start marker */
	segmentStart: '#1976D2',
	/** Course segment end marker */
	segmentEnd: '#f44336',
} as const;

// ---------------------------------------------------------------------------
// Chart chrome colors — axes, gridlines, tick labels
// ---------------------------------------------------------------------------
export const chartColors = {
	grid: '#e0e0e0',
	axis: '#bdbdbd',
	tickLabel: '#757575',
	axisLabel: '#616161',
} as const;

/**
 * Ordered array matching the DataGraph series order:
 * [heart_rate, power, speed]
 */
export const metricColorList = [metricColors.heartRate, metricColors.power, metricColors.speed] as const;

// ---------------------------------------------------------------------------
// Modal styling
// ---------------------------------------------------------------------------
export const modalBorder = '2px solid rgba(0, 0, 0, 0.23)' as const;

// ---------------------------------------------------------------------------
// Card dimensions — recording cards on the ride screen
// ---------------------------------------------------------------------------
export const recordCardMinHeight = '10em' as const;

// ---------------------------------------------------------------------------
// Inline icon sizing — icons placed inline with card titles
// ---------------------------------------------------------------------------
export const inlineIconFontSize = '18px !important' as const;

// ---------------------------------------------------------------------------
// YouTube brand colors — side pane tab, header, and load button
// ---------------------------------------------------------------------------
export const youtubeRed = '#FF0000' as const;
export const youtubeRedHover = '#CC0000' as const;
