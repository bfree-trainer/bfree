// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useState } from 'react';

const PANE_WIDTH = 380;

/**
 * Parse a YouTube URL and return the corresponding embed URL, or null if the
 * input is not a recognised YouTube link.
 *
 * Supported formats:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/playlist?list=PLAYLIST_ID
 *  - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 */
function parseYouTubeUrl(raw: string): string | null {
	let u: URL;
	try {
		u = new URL(raw.trim());
	} catch {
		return null;
	}

	const videoId = u.searchParams.get('v');
	const listId = u.searchParams.get('list');

	if (u.hostname === 'youtu.be') {
		const id = u.pathname.replace(/^\//, '').split('/')[0];
		if (!id) return null;
		return listId
			? `https://www.youtube.com/embed/${id}?list=${listId}`
			: `https://www.youtube.com/embed/${id}`;
	}

	if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
		if (videoId) {
			return listId
				? `https://www.youtube.com/embed/${videoId}?list=${listId}`
				: `https://www.youtube.com/embed/${videoId}`;
		}
		if (listId) {
			return `https://www.youtube.com/embed/videoseries?list=${listId}`;
		}
	}

	return null;
}

/**
 * A hidden side pane that slides in from the right side of the viewport and
 * shows an embedded YouTube player.  A red tab button is always visible on the
 * right edge to let the user open or close the pane.
 */
export default function YouTubeSidePane() {
	const [open, setOpen] = useState(false);
	const [urlInput, setUrlInput] = useState('');
	const [embedUrl, setEmbedUrl] = useState<string | null>(null);
	const [urlError, setUrlError] = useState(false);

	const handleLoad = () => {
		const embed = parseYouTubeUrl(urlInput);
		if (embed) {
			setEmbedUrl(embed);
			setUrlError(false);
		} else {
			setUrlError(true);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleLoad();
	};

	const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setUrlInput(e.target.value);
		if (urlError) setUrlError(false);
	};

	return (
		<>
			{/* Tab button — always visible on the right edge */}
			<Box
				sx={{
					position: 'fixed',
					right: open ? PANE_WIDTH : 0,
					top: '50%',
					transform: 'translateY(-50%)',
					zIndex: 1200,
					transition: 'right 0.3s ease',
				}}
			>
				<IconButton
					onClick={() => setOpen((prev) => !prev)}
					aria-label={open ? 'Close YouTube side pane' : 'Open YouTube side pane'}
					sx={{
						backgroundColor: '#FF0000',
						color: '#fff',
						borderRadius: '8px 0 0 8px',
						padding: '14px 6px',
						'&:hover': {
							backgroundColor: '#CC0000',
						},
					}}
				>
					<YouTubeIcon />
				</IconButton>
			</Box>

			{/* Side pane */}
			<Paper
				elevation={6}
				sx={{
					position: 'fixed',
					right: open ? 0 : -PANE_WIDTH,
					top: 0,
					width: PANE_WIDTH,
					height: '100dvh',
					zIndex: 1199,
					transition: 'right 0.3s ease',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
				}}
				aria-hidden={!open}
			>
				{/* Header */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						px: 1.5,
						py: 1,
						borderBottom: '1px solid',
						borderColor: 'divider',
						backgroundColor: '#FF0000',
						color: '#fff',
						flexShrink: 0,
					}}
				>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
						<YouTubeIcon fontSize="small" />
						<Typography variant="subtitle1" fontWeight="bold">
							YouTube
						</Typography>
					</Box>
					<IconButton
						size="small"
						onClick={() => setOpen(false)}
						aria-label="Close YouTube side pane"
						sx={{ color: '#fff' }}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</Box>

				{/* URL input row */}
				<Box
					sx={{
						display: 'flex',
						gap: 1,
						alignItems: 'flex-start',
						px: 1.5,
						pt: 1.5,
						pb: 0.5,
						flexShrink: 0,
					}}
				>
					<TextField
						size="small"
						fullWidth
						label="YouTube URL"
						placeholder="https://youtube.com/watch?v=…"
						value={urlInput}
						onChange={handleUrlChange}
						onKeyDown={handleKeyDown}
						error={urlError}
						helperText={urlError ? 'Paste a valid YouTube video or playlist URL.' : ''}
						inputProps={{ 'aria-label': 'YouTube URL' }}
					/>
					<Button
						variant="contained"
						onClick={handleLoad}
						sx={{
							flexShrink: 0,
							backgroundColor: '#FF0000',
							'&:hover': { backgroundColor: '#CC0000' },
							// Align with the text field when no helper text is visible.
							mt: urlError ? 0 : 0,
						}}
					>
						Load
					</Button>
				</Box>

				{/* Player area */}
				<Box sx={{ flex: 1, px: 1.5, pb: 1.5, minHeight: 0 }}>
					{embedUrl ? (
						<iframe
							key={embedUrl}
							width="100%"
							height="100%"
							src={embedUrl}
							title="YouTube player"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen
							style={{ border: 'none', display: 'block', borderRadius: 4 }}
						/>
					) : (
						<Box
							sx={{
								width: '100%',
								height: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'text.secondary',
								textAlign: 'center',
								p: 2,
							}}
						>
							<Typography variant="body2">
								Enter a YouTube video or playlist URL above and press <strong>Load</strong> to start
								playing.
							</Typography>
						</Box>
					)}
				</Box>
			</Paper>
		</>
	);
}
