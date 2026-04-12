// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Head from 'next/head';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import 'styles/globals.css';
import CssBaseline from '@mui/material/CssBaseline';
import { red } from '@mui/material/colors';
import PropTypes from 'prop-types';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useEffect } from 'react';

export const cache = createCache({
	key: 'css',
	prepend: true,
});

// Create a theme instance.
const theme = createTheme({
	palette: {
		background: {
			default: '#fafafa',
		},
		primary: {
			main: '#1976D2',
		},
		secondary: {
			main: red.A400,
		},
		error: {
			main: red.A400,
		},
	},
});

function App({ Component, pageProps }) {
	useEffect(() => {
		// Remove the server-side injected CSS.
		const jssStyles = document.querySelector('#jss-server-side');
		if (jssStyles) {
			jssStyles.parentElement.removeChild(jssStyles);
		}

		if ('serviceWorker' in navigator) {
			if (process.env.NODE_ENV === 'production') {
				// Register the service worker for PWA / offline support.
				navigator.serviceWorker.register('/sw.js').catch((err) => {
					console.error('Service worker registration failed:', err);
				});
			} else {
				// In development, unregister any lingering service workers to prevent
				// stale cached responses from interfering with hot module reloading.
				navigator.serviceWorker
					.getRegistrations()
					.then((registrations) => {
						for (const registration of registrations) {
							registration.unregister();
						}
					})
					.catch((err) => {
						console.error('Failed to unregister service workers:', err);
					});
			}
		}
	}, []);

	return (
		<CacheProvider value={cache}>
			<Head>
				<link rel="manifest" href="/manifest.json" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
				/>
			</Head>
			<ThemeProvider theme={theme}>
				{/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
				<CssBaseline />
				<Component {...pageProps} />
			</ThemeProvider>
		</CacheProvider>
	);
}

export default App;

App.propTypes = {
	Component: PropTypes.elementType.isRequired,
	emotionCache: PropTypes.object,
	pageProps: PropTypes.object.isRequired,
};
