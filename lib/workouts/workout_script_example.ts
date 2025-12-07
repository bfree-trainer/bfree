// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

const scriptExample: string = `const hr_hyst = [ 170, 195 ];
let pwr_limit = false;
let interval;
self.addEventListener('message', function(e) {
  const { data: msg } = e;
  /*
   * message:
   * {
   *   time,
   *   distance,
   *   speed,
   * }
   */
  let power;
  let endRide = false;

  if (msg.hr >= hr_hyst[1]) {
    pwr_limit = true;
  } else if (msg.hr < hr_hyst[0]) {
    pwr_limit = false;
  }
  if (pwr_limit) {
    power = 100;
  } else {
    if (msg.time < 1800 * 1000) {
      power = 200;
    } else if (msg.time < 3600 * 1000) {
      power = 150;
    } else {
	  power = 100;
      endRide = true;
    }
  }

  /*
   * response:
   * {
   *   time: msg.time,
   *   message, // Optional message shown to the rider
   *   doSplit, // add a split by setting this to one of these: 'Distance', 'Location', 'Time', 'HeartRate'
   *   doStop, // stop the workout by making this truthy; If a string is given it will be set as a note to the log
   *   // One of the following:
   *   basicLoad,
   *   power,
   *   slope,
   * }
   */
  self.postMessage({
    time: msg.time,
    power,
    doStop: endRide,
  });
}, false);
`;
export default scriptExample;
