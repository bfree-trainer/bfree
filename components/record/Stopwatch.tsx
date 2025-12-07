// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef, useState } from 'react';
import { getElapsedTimeStr } from 'lib/format';

export default function Stopwatch({
	startTime,
	isPaused,
	className,
}: {
	startTime: number;
	isPaused?: boolean;
	className?: any;
}) {
	const [time, setTime] = useState(() => Date.now() - startTime);
	const intervalId = useRef(null);

	useEffect(() => {
		if (!isPaused) {
			setTime((_prev) => Date.now() - startTime);
		}
	}, [startTime, isPaused]);

	useEffect(() => {
		if (intervalId.current) {
			clearInterval(intervalId.current);
			intervalId.current = null;
		}

		if (isPaused) {
			return;
		}

		let offset = Date.now();
		intervalId.current = setInterval(() => {
			const delta = () => {
				const now = Date.now();
				const d = now - offset;

				offset = now;
				return d;
			};

			setTime((prevTime) => prevTime + delta());
		}, 50);

		return () => {
			clearInterval(intervalId.current);
		};
	}, [isPaused]);

	return <div className={className}>{getElapsedTimeStr(time)}</div>;
}
