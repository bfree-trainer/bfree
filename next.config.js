const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
})
