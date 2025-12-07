<!--
SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>

SPDX-License-Identifier: GPL-3.0-or-later
-->

![Bfree logo](/doc/images/logo_tn.png)

Bfree
======

Bfree is an open source smart trainer software for indoor cycling running
entirely in a web browser. The app uses Web Bluetooth to connect to BLE
sensors and a trainer. 

No data is ever uploaded into any cloud service, and if such a features
will be ever implemented it will be totally opt-in. All the date remains
in your browser, plain text, currently in local storage. This might be
changed to something more secure in the future.

![Free Ride mode](/doc/images/freeride.png)

[Try Now](https://bfree.vercel.app/) at https://bfree.vercel.app/

Supported Devices
-----------------

- Tacx smart trainers with BLE connectivity
- Most BLE HRMs
- Most BLE cadence and speed sensors

Getting Started
----------------

Bfree is built on top of [Next.js](https://nextjs.org/) and mostly what
applies to Next.js projects, should work here too.

### Prerequisites

At bare minimum you'll need a web browser that supports Web Bluetooth,
see [here](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#Browser_compatibility).

Only a few browsers support inhibiting screen locking from JS,
see [here](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock).

The app is tested on Microsoft Edge and it should also work on Google Chrome and
its Android derivatives.

To build Bfree locally you'll need Node.js and `npm`.
The [official website](https://nodejs.org/en/) of the Node.js project
helps with that.

As normally with [Next.js](https://nextjs.org/) projects, the following
commands apply.

**Start in dev mode:**

```sh
npm run dev
```

**Run full build:**

```sh
npm run build
```

**Start in production mode:**

```sh
npm start
```

Running the build step is required before this.

### Next.js telemetry

The Next.js telemetry is disabled by default. You can opt-in for the telemetry
by setting the `NEXT_TELEMETRY_DISABLED` environment variable to `0`.

**For example:**

```sh
NEXT_TELEMETRY_DISABLED=0 npm run build
```

License
-------

See [LICENSE.txt](/LICENSE.txt) and SPDX notation in the repo.


Related Work
------------

While Bfree is not a derivative work the following open source projects have
been a great help in understanding how BLE, ANT+, and smart trainers work in
general.

- [jedla22/BleTrainerControl](https://github.com/jedla22/BleTrainerControl)
- [GoldenCheetah](https://github.com/GoldenCheetah/GoldenCheetah)


Useful Links
------------

- [TCX Schema](https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd)
- [ThisIsAnt](https://www.thisisant.com/)
- [Bluetooth SIG - GATT specifications](https://www.bluetooth.com/specifications/gatt/)
