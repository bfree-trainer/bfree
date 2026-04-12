// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const CACHE_NAME = 'bfree-v2';

// Assets that are pre-cached when the service worker installs.
// These cover the app shell so the app loads offline immediately.
const PRECACHE_URLS = [
	'/',
	'/manifest.json',
	'/favicon.ico',
	'/icon-192x192.png',
	'/icon-512x512.png',
];

// Install: pre-cache the app shell.
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting()),
	);
});

// Activate: delete caches from old versions.
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Fetch strategy:
//   - /_next/ paths are intentionally NOT intercepted. Next.js already
//     content-addresses its static chunks (immutable hashes in filenames) and
//     the browser's HTTP cache handles them efficiently. Caching them inside
//     the service worker would only cause stale-chunk errors when a new build
//     is deployed.
//   - Navigation requests (HTML pages) use network-first so that fresh
//     content is preferred when online, falling back to the cache offline.
//   - All other requests (images, fonts, public assets…) use
//     stale-while-revalidate: serve the cached version immediately for speed,
//     then refresh the cache entry in the background so the next request gets
//     the latest content.
self.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only handle GET requests.
	if (request.method !== 'GET') return;

	// Skip non-http(s) schemes (e.g. chrome-extension://).
	if (!request.url.startsWith('http')) return;

	// Let Next.js's own HTTP cache headers handle all /_next/ requests.
	// These files are content-addressed (immutable hashes) in production, so
	// a service worker cache layer would only introduce stale-chunk problems.
	const url = new URL(request.url);
	if (url.pathname.startsWith('/_next/')) return;

	const isNavigation =
		request.mode === 'navigate' ||
		request.destination === 'document';

	if (isNavigation) {
		// Network-first for HTML pages.
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches
						.open(CACHE_NAME)
						.then((cache) => cache.put(request, clone))
						.catch((err) =>
							console.error('Failed to cache response:', err),
						);
					return response;
				})
				.catch(() =>
					caches
						.match(request)
						.then((cached) => cached || Response.error()),
				),
		);
	} else {
		// Stale-while-revalidate for public assets (images, fonts, icons…).
		// Serve from cache immediately if available, then always refresh in
		// the background so the next request gets the latest content.
		event.respondWith(
			caches.open(CACHE_NAME).then((cache) =>
				cache.match(request).then((cached) => {
					const networkFetch = fetch(request).then((response) => {
						cache
							.put(request, response.clone())
							.catch((err) =>
								console.error('Failed to update cache:', err),
							);
						return response;
					});
					// Always kick off the network request so the cache is kept
					// fresh (true stale-while-revalidate behaviour).
					if (cached) {
						networkFetch.catch(() => {});
						return cached;
					}
					return networkFetch;
				}),
			),
		);
	}
});
