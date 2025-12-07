// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useState, useEffect, useRef } from 'react';

// https://overreacted.io/making-setinterval-declarative-with-react-hooks/
//	useInterval(() => {
//	// Your custom logic here
//		setCount(count + 1);
//	}, 1000);

function useInterval(callback: () => Promise<void>, delay: number | null) {
	const savedCallback = useRef<() => Promise<void>>();

	// Remember the latest callback.
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval.
	useEffect(() => {
		function tick() {
			savedCallback.current().catch(console.error);
		}
		if (delay !== null) {
			tick();
			let id = setInterval(tick, delay);
			return () => clearInterval(id);
		}
	}, [delay]);
}

export default useInterval;
