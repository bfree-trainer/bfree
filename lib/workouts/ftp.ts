// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const minSlope = 1;
const maxSlope = 5;
const _1min = 60 * 1000;

export default function generateFTPTest(currentFTP: number): string {
	const ftp65 = currentFTP * 0.65;

	return `
const steps = [
  [ ${10 * _1min}, { power: ${ftp65},     message: 'Warmup: 10 min Easy' } ], // Warmup 65 % FTP
  [ ${11 * _1min}, { slope: ${minSlope},  message: 'Warmup: 1 min Fast pedaling 100 RPM' } ],
  [ ${12 * _1min}, { slope: 0,            message: 'Warmup: 1 min Recovery' } ],
  [ ${13 * _1min}, { slope: ${minSlope},  message: 'Warmup: 1 min Fast pedaling 100 RPM' } ],
  [ ${14 * _1min}, { slope: 0,            message: 'Warmup: 1 min Recovery' } ],
  [ ${15 * _1min}, { slope: ${minSlope},  message: 'Warmup: 1 min Fast pedaling 100 RPM' } ],
  [ ${20 * _1min}, { power: ${ftp65},     message: 'Warmup: 5 min Easy' }],
  [ ${25 * _1min}, { slope: ${maxSlope},  message: 'Main: 5 min All-out', doSplit: 'Time' }],
  [ ${35 * _1min}, { power: ${ftp65},     message: 'Main: 10 min Recovery', doSplit: 'Time' } ],
  [ ${55 * _1min}, { slope: ${maxSlope},  message: 'Main: 20 min All-out', doSplit: 'Time' }],
];
let coolDownSplitAdded = false;

self.addEventListener('message', function(e) {
  const { data: msg } = e;

  for (const [t, resp] of steps) {
	if (msg.time <= t) {
	  self.postMessage({
	    ...resp,
  	    time: msg.time,
  	  });

	  if (resp.doSplit) {
	    // We only want to split once.
		delete resp.doSplit;
	  }

	  return;
	}
  }

  // Adaptive cool-down
  if (msg.time < ${56 * _1min} || msg.speed > 1.0) {
	const resp = {
	  slope: 0,
	  message: 'Cool-down'
	};

	if (!coolDownSplitAdded) {
		resp.doSplit = 'Time';
		coolDownSplitAdded = true;
	}

	self.postMessage(resp);
	return;
  }

  // Stop the test
  self.postMessage({
    time: msg.time,
    doStop: 'TODO FTP HERE',
  });
}, false);
	`;
}
