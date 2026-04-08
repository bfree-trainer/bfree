<!--
SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>

SPDX-License-Identifier: GPL-3.0-or-later
-->

Contributing to Bfree
======================

Thank you for your interest in contributing to Bfree! This document explains
how to set up the development environment and describes features that are
useful during development.

Getting Started
---------------

### Prerequisites

- Node.js and `npm` (see the [Node.js website](https://nodejs.org/en/))
- A web browser with Web Bluetooth support (Microsoft Edge or Google Chrome)

### Installation

```sh
npm install
```

### Development server

```sh
npm run dev
```

### Production build

```sh
npm run build
npm start
```

### Linting

```sh
./node_modules/.bin/eslint .
```

Trainer Emulator Mode
---------------------

Working on trainer-related features normally requires a physical BLE smart
trainer. To make development and testing easier without hardware, Bfree
includes a **trainer emulator** that hooks into the same API as a real trainer.

### Enabling the emulator

The emulator is an opt-in build-time feature controlled by the
`NEXT_PUBLIC_TRAINER_EMULATOR` environment variable. Because it is a
compile-time flag, the emulator code is **completely excluded from the
bundle** in standard builds; it only appears when you explicitly enable it.

```sh
# Development server with the emulator enabled
NEXT_PUBLIC_TRAINER_EMULATOR=1 npm run dev

# Production build with the emulator enabled
NEXT_PUBLIC_TRAINER_EMULATOR=1 npm run build
```

### What the emulator does

When the emulator is enabled:

1. **Sensor setup page** – the BLE smart trainer card is replaced by a
   *Trainer Emulator* card. The emulator starts automatically on page load
   and persists across page navigations, just like a real BLE connection.
   A *Calibrate* action simulates a successful spin-down calibration after
   about two seconds.

2. **Ride / record page** – a small overlay panel appears in the bottom-right
   corner of the screen. It shows the current resistance mode and setting, and
   provides a **speed slider** (0–60 km/h) that you drag to simulate the
   rider's speed. Measurements are emitted at 1 Hz.

### Resistance modes

The emulator supports three resistance models, which are selected
automatically depending on which control command the app sends:

| Mode | Activated by | Description |
|------|-------------|-------------|
| `basic` | `sendBasicResistance` | Rough drag model — power ∝ resistance% × speed |
| `power` | `sendTargetPower` | Reports `targetPower` directly (perfect trainer simulation) |
| `slope` | `sendSlope` | Full physics: gravity + rolling resistance + wind drag |

### Typical debugging workflow

1. Start the dev server with the emulator enabled.
2. Open the app in Chrome or Edge.
3. Go to **Setup → Sensors** — the emulator starts and registers itself as the
   smart trainer automatically.
4. Navigate to a ride mode (Free Ride, Workout, etc.).
5. Use the speed slider on the overlay to simulate pedalling and observe how
   the app responds to the generated measurements.

### Implementation notes

| File | Purpose |
|------|---------|
| `lib/ble/trainer_emulator.ts` | Core emulator — drop-in replacement for `createSmartTrainerController` |
| `components/TrainerEmulator.tsx` | Overlay UI rendered on the record page |
| `pages/setup/sensors.tsx` | Replaces the BLE card with the emulator setup card when the flag is set |
| `pages/ride/record.tsx` | Conditionally renders the overlay component |

The emulator is gated by `process.env.NEXT_PUBLIC_TRAINER_EMULATOR === '1'`
so that standard production builds contain no emulator code at all.
