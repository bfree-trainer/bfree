module.exports = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
	env: {
		// URL of a JSON file listing available virtual ride video clips.
		// Each entry should conform to the VideoClip type in lib/virtual_video.ts.
		NEXT_PUBLIC_VIRTUAL_VIDEOS_URL: process.env.NEXT_PUBLIC_VIRTUAL_VIDEOS_URL || '',
	},
}
