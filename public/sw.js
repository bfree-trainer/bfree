// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const CACHE_NAME = 'bfree-v1';

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
//   - Navigation requests (HTML pages) use network-first so that fresh
//     content is preferred when online, falling back to the cache offline.
//   - All other requests (JS, CSS, images, fonts…) use cache-first for
//     performance, fetching from the network and updating the cache on miss.
self.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only handle GET requests.
	if (request.method !== 'GET') return;

	// Skip non-http(s) schemes (e.g. chrome-extension://).
	if (!request.url.startsWith('http')) return;

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
		// Cache-first for everything else (JS, CSS, images, fonts…).
		event.respondWith(
			caches.match(request).then(
				(cached) =>
					cached ||
					fetch(request).then((response) => {
						const clone = response.clone();
						caches
							.open(CACHE_NAME)
							.then((cache) => cache.put(request, clone))
							.catch((err) =>
								console.error('Failed to cache response:', err),
							);
						return response;
					}),
			),
		);
	}
});
