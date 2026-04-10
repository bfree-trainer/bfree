module.exports = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
	env: {
		// URL of a JSON file listing available virtual ride video clips.
		// Each entry should conform to the VideoClip type in lib/virtual_video.ts.
		NEXT_PUBLIC_VIRTUAL_VIDEOS_URL: process.env.NEXT_PUBLIC_VIRTUAL_VIDEOS_URL || '',
		// Base URL of the OSRM routing server (bicycle profile).
		// Override to point to a self-hosted OSRM instance:
		// https://project-osrm.org/
		NEXT_PUBLIC_OSRM_BASE_URL:
			process.env.NEXT_PUBLIC_OSRM_BASE_URL || 'https://router.project-osrm.org/route/v1',
	},
}
