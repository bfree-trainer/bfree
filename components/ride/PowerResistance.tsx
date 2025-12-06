import Slider from '@mui/material/Slider';
import RideSetupCard, { SetupFormControl } from 'components/ride/RideSetupCard';

export type PowerLimits = { min: number; max: number };

const minDistance = 100;

function valuetext(value: number) {
	return `${value} W`;
}

export default function PowerResistance({
	limits,
	setLimits,
}: {
	limits: { min: number; max: number };
	setLimits: (limits: PowerLimits) => void;
}) {
	const handleChange = (event: Event, newValue: number[], activeThumb: number) => {
		if (newValue[1] - newValue[0] < minDistance) {
			if (activeThumb === 0) {
				const clamped = Math.min(newValue[0], 1000 - minDistance);
				setLimits({ min: clamped, max: clamped + minDistance });
			} else {
				const clamped = Math.max(newValue[1], minDistance);
				setLimits({ min: clamped - minDistance, max: clamped });
			}
		} else {
			setLimits({ min: newValue[0], max: newValue[1] });
		}
	};

	return (
		<RideSetupCard title="Power" image="/images/cards/slope.jpg">
			<SetupFormControl>
				<Slider
					getAriaLabel={() => 'Min and max power'}
					value={[ limits.min, limits.max ]}
					min={0}
					max={1000}
					onChange={handleChange}
					valueLabelDisplay="auto"
					valueLabelFormat={valuetext}
					getAriaValueText={valuetext}
					disableSwap
				/>
			</SetupFormControl>
		</RideSetupCard>
	);
}
