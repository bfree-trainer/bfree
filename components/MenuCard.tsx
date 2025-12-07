// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Link from 'next/link';
import Typography from '@mui/material/Typography';

export default function MenuCard({ title, href, children }: { title: string; href: string; children?: any }) {
	return (
		<Grid item xs={12}>
			<Link href={href || '/'}>
				<Card variant="outlined" sx={{ '&:hover': { backgroundColor: 'lightgrey' } }}>
					<CardContent>
						<Typography gutterBottom variant="h5" component="h2">
							{title}&nbsp;&rarr;
						</Typography>
						<Typography variant="body2" color="textSecondary" component="p">
							{children || ''}
						</Typography>
					</CardContent>
				</Card>
			</Link>
		</Grid>
	);
}
