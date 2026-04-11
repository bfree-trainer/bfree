// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import MyHead from 'components/MyHead';
import StartButton from 'components/StartButton';
import Title from 'components/Title';
import { VideoClip, SyncMethod } from 'lib/virtual_video';
import { useEffect, useState } from 'react';

const VIDEOS_URL = process.env.NEXT_PUBLIC_VIRTUAL_VIDEOS_URL;

/** Auto-select sync method: GPS first, then average speed, then none. */
function chooseSyncMethod(clip: VideoClip): SyncMethod {
	if (clip.gpxUrl) return 'gps';
	if (clip.avgSpeedKmh !== undefined) return 'average';
	return 'none';
}

function makeStartUrl(clip: VideoClip): string {
	const syncMethod = chooseSyncMethod(clip);
	const params = new URLSearchParams({
		type: 'virtual',
		videoUrl: clip.videoUrl,
		syncMethod,
	});
	if (clip.gpxUrl) {
		params.set('gpxUrl', clip.gpxUrl);
	}
	if (syncMethod === 'average' && clip.avgSpeedKmh !== undefined) {
		params.set('avgSpeedKmh', String(clip.avgSpeedKmh));
	}
	if (clip.roadSurface) {
		params.set('roadSurface', clip.roadSurface);
	}
	return `/ride/trainer/record?${params.toString()}`;
}

function VideoClipCard({ clip, selected, onSelect }: { clip: VideoClip; selected: boolean; onSelect: () => void }) {
	return (
		<Grid item xs={12} sm={6}>
			<Card variant="outlined" sx={selected ? { borderColor: 'primary.main', borderWidth: 2 } : {}}>
				<CardActionArea onClick={onSelect}>
					<CardContent>
						<Typography variant="h6">{clip.title}</Typography>
						{clip.avgSpeedKmh !== undefined && (
							<Typography variant="body2" color="text.secondary">
								Avg speed: {clip.avgSpeedKmh} km/h
							</Typography>
						)}
						<Typography variant="caption" color="text.secondary">
							{clip.copyright}
						</Typography>
					</CardContent>
				</CardActionArea>
			</Card>
		</Grid>
	);
}

type FetchState = { clips: VideoClip[]; loading: boolean; error: string | null };

export default function RideVirtual() {
	const [fetchState, setFetchState] = useState<FetchState>(() => {
		if (!VIDEOS_URL) {
			return {
				clips: [],
				loading: false,
				error: 'No virtual video feed configured (NEXT_PUBLIC_VIRTUAL_VIDEOS_URL).',
			};
		}
		return { clips: [], loading: true, error: null };
	});
	const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);

	useEffect(() => {
		if (!VIDEOS_URL) return;

		fetch(VIDEOS_URL)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<VideoClip[]>;
			})
			.then((data) => {
				setFetchState({ clips: data, loading: false, error: null });
			})
			.catch((err: Error) => {
				setFetchState({ clips: [], loading: false, error: `Failed to load video clips: ${err.message}` });
			});
	}, []);

	const { clips, loading, error } = fetchState;

	const canStart = selectedClip !== null;

	return (
		<Container maxWidth="md">
			<MyHead title="Virtual Ride" />
			<Box>
				<Title href="/ride/trainer">Virtual Ride</Title>
				<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
					Choose a video for your ride.
				</Typography>

				{loading && (
					<Box display="flex" justifyContent="center" mt={4}>
						<CircularProgress />
					</Box>
				)}

				{error && (
					<Typography color="error" sx={{ mt: 2 }}>
						{error}
					</Typography>
				)}

				{!loading && !error && clips.length === 0 && (
					<Typography sx={{ mt: 2 }}>No videos available yet.</Typography>
				)}

				<Grid container direction="row" alignItems="stretch" spacing={2} sx={{ mt: 1 }}>
					{clips.map((clip) => (
						<VideoClipCard
							key={clip.videoUrl}
							clip={clip}
							selected={selectedClip === clip}
							onSelect={() => setSelectedClip(clip)}
						/>
					))}
				</Grid>
			</Box>

			<Box
				sx={{ left: 0, width: '100%' }}
				position="sticky"
				bottom="0px"
				m="auto"
				display="flex"
				justifyContent="center"
				padding="1ex"
			>
				<StartButton disabled={!canStart} href={canStart ? makeStartUrl(selectedClip) : '#'} />
			</Box>
		</Container>
	);
}
