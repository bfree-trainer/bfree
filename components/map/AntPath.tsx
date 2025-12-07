// SPDX-FileCopyrightText: Olli Vanhoja <olli.vanhoja@gmail.com>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LayerProps, createLayerComponent } from '@react-leaflet/core';
import { antPath } from 'leaflet-ant-path';

export interface AntPathProps extends LayerProps {
	positions: [number, number][];
	options?: {
		paused?: boolean;
		reverse?: boolean;
		hardwareAccelerated?: true;
		pulseColor?: string;
		delay?: number;
		dashArray?: [number, number] | string;
	};
}

export default createLayerComponent<antPath, AntPathProps>(
	function createAntPath({ positions, options }, ctx) {
		const instance = antPath(positions, options);
		return {
			instance,
			context: { ...ctx, overlayContainer: instance },
		};
	},
	function updateAntPath(layer, props, prevProps) {
		if (props.positions !== prevProps.positions) {
			layer.setLatLngs(props.positions);
		}
		// TODO
		//layer.setStyle({ ...prevProps.options, ...props.options });
	}
);
