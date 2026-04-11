// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { useState } from 'react';
import MyHead from 'components/MyHead';
import Title from 'components/Title';
import Typography from '@mui/material/Typography';
import RoutePlannerPanel from 'components/RoutePlannerPanel';
import StartButton from 'components/StartButton';

export default function RideMap() {
const [editMode, setEditMode] = useState(false);

return (
<Container maxWidth="md">
<MyHead title="Map Ride" />
<Box>
<Title href="/ride/trainer">Map Ride</Title>
<Typography variant="body1" color="text.primary" sx={{ mt: 2, mb: 2 }}>
Plan a route or import a GPX file.
</Typography>
<RoutePlannerPanel onEditModeChange={setEditMode} />
</Box>
<StartButton disabled={editMode} href={`/ride/trainer/record?type=map&mapId=todo`} />
</Container>
);
}
