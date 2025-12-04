import { ThemeProvider, createTheme } from '@mui/material/styles';
import 'styles/globals.css'
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
  }, []);

  return (
    <CacheProvider value={cache}>
		<ThemeProvider theme={theme}>
			{/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
			<CssBaseline />
			<Component {...pageProps} />
		</ThemeProvider>
    </CacheProvider>
  );
}

export default App

App.propTypes = {
	Component: PropTypes.elementType.isRequired,
	emotionCache: PropTypes.object,
	pageProps: PropTypes.object.isRequired,
};
