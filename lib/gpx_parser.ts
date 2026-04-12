// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import haversine from './haversine';
import { decompressGzip, isGzipFile } from './decompress';

export type Coord = {
	lat: number;
	lon: number;
};
export type Trackpoint = Coord & {
	ele?: number;
	time?: Date;
	hr?: number;
	cadence?: number;
	power?: number;
	temp?: number; // Air temperature in °C
};
export type Segment = {
	trackpoints: Trackpoint[];
};
export type Track = {
	name?: string;
	segments: Segment[];
};
export type Routepoint = Coord;
export type Route = {
	name?: string;
	routepoints: Routepoint[];
};
export type Waypoint = Coord & {
	name?: string;
	ele?: number;
};
export type CourseData = {
	tracks: Track[];
	routes: Route[];
	waypoints: Waypoint[];
};

export async function parseGpxFile2Document(file: File): Promise<Document> {
	let text: string;
	if (isGzipFile(file.name)) {
		const compressed = await file.arrayBuffer();
		const decompressed = await decompressGzip(compressed);
		text = new TextDecoder().decode(decompressed);
	} else {
		text = await file.text();
	}
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(text, 'text/xml');
	const errorNode = xmlDoc.querySelector('parsererror');
	if (errorNode) {
		throw new Error('Failed to parse the GPX file');
	}
	return xmlDoc;
}

export function parseGpxText2Document(text: string): Document {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(text, 'text/xml');
	const errorNode = xmlDoc.querySelector('parsererror');
	if (errorNode) {
		throw new Error('Failed to parse the GPX data');
	}
	return xmlDoc;
}

function* elIter<T>(el: HTMLCollectionOf<Element>, callback: (el: Element) => T) {
	for (let i = 0; i < el.length; i++) {
		yield callback(el[i]);
	}
}

function getElValue(el: HTMLCollectionOf<Element>) {
	return el[0].childNodes[0].nodeValue;
}

/**
 * Search the `<extensions>` child of a trackpoint element for a descendant
 * whose local name (ignoring namespace prefix) matches `localName`.
 * Returns the numeric value, or undefined if not found / not a number.
 */
function getExtensionNumericValue(trkptEl: Element, localName: string): number | undefined {
	const extensionsEls = trkptEl.getElementsByTagName('extensions');
	if (extensionsEls.length === 0) return undefined;

	const all = extensionsEls[0].getElementsByTagName('*');
	for (let i = 0; i < all.length; i++) {
		const child = all[i];
		// child.localName strips any namespace prefix (e.g. "gpxtpx:hr" → "hr")
		if (child.localName === localName) {
			const val = parseFloat(child.textContent ?? '');
			if (!Number.isNaN(val)) return val;
		}
	}
	return undefined;
}

function parseTrackpoint(el: Element): Trackpoint {
	const trackpoint: Trackpoint = {
		lat: parseFloat(el.getAttribute('lat')),
		lon: parseFloat(el.getAttribute('lon')),
	};
	const ele = parseFloat(getElValue(el.getElementsByTagName('ele')));
	if (!Number.isNaN(ele)) {
		trackpoint.ele = ele;
	}
	const timeEls = el.getElementsByTagName('time');
	if (timeEls.length > 0) {
		const timeStr = timeEls[0].childNodes[0]?.nodeValue;
		if (timeStr) {
			const parsed = new Date(timeStr);
			if (!Number.isNaN(parsed.getTime())) {
				trackpoint.time = parsed;
			}
		}
	}

	const hr = getExtensionNumericValue(el, 'hr');
	if (hr !== undefined) {
		trackpoint.hr = hr;
	}
	const cadence = getExtensionNumericValue(el, 'cad');
	if (cadence !== undefined) {
		trackpoint.cadence = cadence;
	}
	const power =
		getExtensionNumericValue(el, 'PowerInWatts') ??
		getExtensionNumericValue(el, 'watts') ??
		getExtensionNumericValue(el, 'power');
	if (power !== undefined) {
		trackpoint.power = power;
	}
	const temp = getExtensionNumericValue(el, 'atemp') ?? getExtensionNumericValue(el, 'temp');
	if (temp !== undefined) {
		trackpoint.temp = temp;
	}

	return trackpoint;
}

function parseTrackpoints(trackpoints: HTMLCollectionOf<Element>): Trackpoint[] {
	return [...elIter<Trackpoint>(trackpoints, parseTrackpoint)];
}

function parseSegments(segments: HTMLCollectionOf<Element>): Segment[] {
	return [
		...elIter(segments, (segment) => ({
			trackpoints: parseTrackpoints(segment.getElementsByTagName('trkpt')),
		})),
	];
}

function parseTracks(tracks: HTMLCollectionOf<Element>): Track[] {
	return [
		...elIter<Track>(tracks, (track) => ({
			name: getElValue(track.getElementsByTagName('name')),
			segments: parseSegments(track.getElementsByTagName('trkseg')),
		})),
	];
}

function parseRoutepoints(routepoints: HTMLCollectionOf<Element>): Routepoint[] {
	return [
		...elIter<Routepoint>(routepoints, (routepoint) => ({
			lat: parseFloat(routepoint.getAttribute('lat')),
			lon: parseFloat(routepoint.getAttribute('lon')),
		})),
	];
}

function parseRoutes(routes: HTMLCollectionOf<Element>): Route[] {
	return [
		...elIter<Route>(routes, (route) => ({
			name: getElValue(route.getElementsByTagName('name')),
			routepoints: parseRoutepoints(route.getElementsByTagName('rtept')),
		})),
	];
}

function parseWaypoints(waypoints: HTMLCollectionOf<Element>): Waypoint[] {
	return [
		...elIter<Waypoint>(waypoints, (waypoint) => ({
			name: getElValue(waypoint.getElementsByTagName('name')),
			lat: parseFloat(waypoint.getAttribute('lat')),
			lon: parseFloat(waypoint.getAttribute('lon')),
		})),
	];
}

export function gpxDocument2obj(doc: Document): CourseData {
	return {
		tracks: parseTracks(doc.documentElement.getElementsByTagName('trk')),
		routes: parseRoutes(doc.documentElement.getElementsByTagName('rte')),
		waypoints: parseWaypoints(doc.documentElement.getElementsByTagName('wpt')),
	};
}

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function courseData2gpx(data: CourseData): string {
	const lines: string[] = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<gpx version="1.1" creator="Bfree" xmlns="http://www.topografix.com/GPX/1/1">',
	];

	for (const wpt of data.waypoints) {
		const nameAttr = wpt.name ? `<name>${escapeXml(wpt.name)}</name>` : '';
		const eleAttr = wpt.ele != null ? `<ele>${wpt.ele}</ele>` : '';
		lines.push(`  <wpt lat="${wpt.lat}" lon="${wpt.lon}">${nameAttr}${eleAttr}</wpt>`);
	}

	for (const route of data.routes) {
		lines.push('  <rte>');
		if (route.name) lines.push(`    <name>${escapeXml(route.name)}</name>`);
		for (const rpt of route.routepoints) {
			lines.push(`    <rtept lat="${rpt.lat}" lon="${rpt.lon}" />`);
		}
		lines.push('  </rte>');
	}

	for (const track of data.tracks) {
		lines.push('  <trk>');
		if (track.name) lines.push(`    <name>${escapeXml(track.name)}</name>`);
		for (const seg of track.segments) {
			lines.push('    <trkseg>');
			for (const tp of seg.trackpoints) {
				const children: string[] = [];
				if (tp.ele != null) children.push(`<ele>${tp.ele}</ele>`);
				if (tp.time) children.push(`<time>${tp.time.toISOString()}</time>`);
				if (children.length > 0) {
					lines.push(`      <trkpt lat="${tp.lat}" lon="${tp.lon}">${children.join('')}</trkpt>`);
				} else {
					lines.push(`      <trkpt lat="${tp.lat}" lon="${tp.lon}" />`);
				}
			}
			lines.push('    </trkseg>');
		}
		lines.push('  </trk>');
	}

	lines.push('</gpx>');
	return lines.join('\n');
}

export function getMapBounds(obj: CourseData) {
	const points = [
		...obj.tracks
			.map(({ segments }) => segments)
			.flat(1)
			.map(({ trackpoints }) => trackpoints)
			.flat(1),
		...obj.routes.map(({ routepoints }) => routepoints).flat(1),
		...obj.waypoints,
	];
	const lats = points.map(({ lat }) => lat);
	const lons = points.map(({ lon }) => lon);
	return {
		minlat: Math.min(...lats),
		maxlat: Math.max(...lats),
		minlon: Math.min(...lons),
		maxlon: Math.max(...lons),
	};
}

/**
 * Calculate the total distance of a course in meters.
 * Sums haversine distances between consecutive trackpoints in all tracks
 * and between consecutive routepoints in all routes.
 */
export function courseDistanceM(data: CourseData): number {
	let total = 0;

	for (const track of data.tracks) {
		for (const seg of track.segments) {
			const pts = seg.trackpoints;
			for (let i = 1; i < pts.length; i++) {
				total += haversine([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
			}
		}
	}

	for (const route of data.routes) {
		const pts = route.routepoints;
		for (let i = 1; i < pts.length; i++) {
			total += haversine([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
		}
	}

	return total;
}
