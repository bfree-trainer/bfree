module.exports = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
	env: {
		// URL of a JSON file listing available virtual ride video clips.
		// Each entry should conform to the VideoClip type in lib/virtual_video.ts.
		NEXT_PUBLIC_VIRTUAL_VIDEOS_URL: process.env.NEXT_PUBLIC_VIRTUAL_VIDEOS_URL || '',
		// Base URL of the OSRM routing server (bicycle profile).
		// Override to point to a self-hosted OSRM instance:
		// https://project-osrm.org/
		NEXT_PUBLIC_OSRM_BASE_URL: process.env.NEXT_PUBLIC_OSRM_BASE_URL || 'https://router.project-osrm.org/route/v1',
		// Set to '1' to enable the trainer emulator (opt-in, build-time flag).
		NEXT_PUBLIC_TRAINER_EMULATOR: process.env.NEXT_PUBLIC_TRAINER_EMULATOR || '',
	},
	async headers() {
		return [
			{
				// The service worker script must never be served from a cache so
				// browsers always pick up the latest version on each page load.
				source: '/sw.js',
				headers: [
					{
						key: 'Cache-Control',
						value: 'no-cache, no-store, must-revalidate',
					},
					{ key: 'Pragma', value: 'no-cache' },
				],
			},
		];
	},
}
