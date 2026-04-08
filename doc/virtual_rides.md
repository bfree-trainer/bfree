<!--
SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>

SPDX-License-Identifier: GPL-3.0-or-later
-->

Virtual Rides with Video
========================

Virtual ride mode plays a recorded video clip while syncing the video playback
speed to the rider's current cycling speed.  Live telemetry (time, distance,
cadence, speed, power, and heart rate) is overlaid on top of the video.

Configuration
-------------

Set the `NEXT_PUBLIC_VIRTUAL_VIDEOS_URL` environment variable at build time to
the URL of a JSON file that lists the available video clips:

```
NEXT_PUBLIC_VIRTUAL_VIDEOS_URL=https://example.com/videos.json npm run build
```

Video Clip JSON Format
----------------------

The URL must point to a JSON array where each element describes one virtual
ride clip:

```json
[
  {
    "title": "Alpine Route",
    "gpxUrl": "https://example.com/alpine.gpx",
    "videoUrl": "https://example.com/alpine.mp4",
    "copyright": "© 2024 Jane Doe",
    "avgSpeedKmh": 24.5
  }
]
```

### Fields

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `title`        | `string` | Yes      | Display name shown in the clip selection list. |
| `gpxUrl`       | `string` | Yes      | HTTPS URL of a GPX file describing the route. Used for GPS-based speed sync (see below). |
| `videoUrl`     | `string` | Yes      | HTTPS URL of the video clip file (e.g. MP4). Must be accessible by the browser; ensure CORS headers are set appropriately. |
| `copyright`    | `string` | Yes      | Copyright notice displayed to the user. |
| `avgSpeedKmh`  | `number` | No       | Average cycling speed of the original recording in km/h. Required to enable the **average-speed sync** method. |

Speed Sync Methods
------------------

The sync method is chosen automatically based on what information is available in the clip:

| Priority | Condition | Method used |
|----------|-----------|-------------|
| 1st | `gpxUrl` present | **GPS sync** |
| 2nd | `avgSpeedKmh` present | **Average speed sync** |
| 3rd | Neither | **No sync** (video plays at constant speed) |

### Average speed sync

```
playbackRate = riderSpeed / avgSpeedKmh
```

The video is sped up or slowed down so that it plays at normal speed when the
rider matches the average speed that was recorded in the video.  This requires
the `avgSpeedKmh` field to be set.

### GPS sync

```
playbackRate = riderSpeed / originalSpeedAtCurrentVideoPosition
```

The GPX file (pointed to by `gpxUrl`) must contain timestamped track points
(`<trkpt>` elements with a `<time>` child).  The original speed at the current
video position is estimated by interpolating between the two surrounding
timestamped track points.  This gives a more faithful speed relationship
because it also reflects the natural speed variations in the original recording
(descents, climbs, stops, etc.).

Both methods clamp `playbackRate` to the range **[0.1, 4.0]**.

GPX Requirements for GPS Sync
------------------------------

The GPX file must include `<time>` elements inside each `<trkpt>`:

```xml
<trk>
  <trkseg>
    <trkpt lat="47.123" lon="9.456">
      <ele>1200</ele>
      <time>2024-06-01T10:00:00Z</time>
    </trkpt>
    <trkpt lat="47.124" lon="9.457">
      <ele>1205</ele>
      <time>2024-06-01T10:00:05Z</time>
    </trkpt>
    <!-- ... -->
  </trkseg>
</trk>
```

Track points without a `<time>` element are silently ignored when computing
GPS-based playback rates.
