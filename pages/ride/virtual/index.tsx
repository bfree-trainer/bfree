// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import MyHead from 'components/MyHead';
import StartButton from 'components/StartButton';
import Title from 'components/Title';
import { VideoClip, SyncMethod } from 'lib/virtual_video';
import { useEffect, useState } from 'react';

const VIDEOS_URL = process.env.NEXT_PUBLIC_VIRTUAL_VIDEOS_URL;

function makeStartUrl(clip: VideoClip, syncMethod: SyncMethod): string {
	const params = new URLSearchParams({
		type: 'virtual',
		videoUrl: clip.videoUrl,
		gpxUrl: clip.gpxUrl,
		syncMethod,
	});
	if (syncMethod === 'average' && clip.avgSpeedKmh !== undefined) {
		params.set('avgSpeedKmh', String(clip.avgSpeedKmh));
	}
	return `/ride/record?${params.toString()}`;
}

function VideoClipCard({
	clip,
	selected,
	onSelect,
}: {
	clip: VideoClip;
	selected: boolean;
	onSelect: () => void;
}) {
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
	const [syncMethod, setSyncMethod] = useState<SyncMethod>('average');

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

	const canStart =
		selectedClip !== null &&
		(syncMethod === 'gps' || (syncMethod === 'average' && selectedClip.avgSpeedKmh !== undefined));

	return (
		<Container maxWidth="md">
			<MyHead title="Virtual Ride" />
			<Box>
				<Title href="/ride">Virtual Ride</Title>
				<p>Select a video clip to ride along with.</p>

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
					<Typography sx={{ mt: 2 }}>No video clips available.</Typography>
				)}

				<Grid container direction="row" alignItems="stretch" spacing={2} sx={{ mt: 1 }}>
					{clips.map((clip, i) => (
						<VideoClipCard
							key={i}
							clip={clip}
							selected={selectedClip === clip}
							onSelect={() => setSelectedClip(clip)}
						/>
					))}
				</Grid>

				{selectedClip && (
					<Box sx={{ mt: 3 }}>
						<FormControl component="fieldset">
							<FormLabel component="legend">Speed Sync Method</FormLabel>
							<RadioGroup
								value={syncMethod}
								onChange={(e) => setSyncMethod(e.target.value as SyncMethod)}
							>
								<FormControlLabel
									value="average"
									control={<Radio />}
									label="Sync to average speed of the video"
									disabled={selectedClip.avgSpeedKmh === undefined}
								/>
								<FormControlLabel
									value="gps"
									control={<Radio />}
									label="Sync to embedded GPS speed in the GPX file"
								/>
							</RadioGroup>
						</FormControl>
					</Box>
				)}
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
				<StartButton disabled={!canStart} href={canStart ? makeStartUrl(selectedClip, syncMethod) : '#'} />
			</Box>
		</Container>
	);
}

