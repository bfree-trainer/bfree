// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

export type Coord = {
	lat: number;
	lon: number;
};
export type Trackpoint = Coord & {
	ele?: number;
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
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(e.target.result as string, 'text/xml');
			const errorNode = xmlDoc.querySelector('parsererror');
			if (errorNode) {
				reject(new Error('Failed to parse the GPX file'));
			} else {
				resolve(xmlDoc);
			}
		};
		reader.readAsText(file);
	});
}

function* elIter<T>(el: HTMLCollectionOf<Element>, callback: (el: Element) => T) {
	for (let i = 0; i < el.length; i++) {
		yield callback(el[i]);
	}
}

function getElValue(el: HTMLCollectionOf<Element>) {
	return el[0].childNodes[0].nodeValue;
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
