import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { ReactNode, useState } from 'react';
import RideSetupCard, { SetupFormControl } from 'components/ride/RideSetupCard';
import { UnsignedField } from 'components/SetupComponents';

export type TrainerResistanceMode = '' | 'basic' | 'power' | 'slope';
type AutoSplitMode = 'disabled' | 'distance' | 'time' | 'heartRate';

export default function ResistanceMode({
	resistanceMode,
	setResistanceMode,
	setAutoSplitValue,
}: {
	resistanceMode: TrainerResistanceMode;
	setResistanceMode: (m: TrainerResistanceMode) => void;
	setAutoSplitValue: (v: string) => void;
}) {
	const [autoSplitMode, setAutoSplitMode] = useState<AutoSplitMode>('disabled');
	const handleResistanceModeChange = (event: SelectChangeEvent<string>, _child?: ReactNode) => {
		setResistanceMode(event.target.value as TrainerResistanceMode);
	};
	const handleAutoSplitChange = (event: SelectChangeEvent<string>, _child?: ReactNode) => {
		setAutoSplitMode(event.target.value as AutoSplitMode);
		setAutoSplitValue('');
	};

	return (
		<RideSetupCard
			title="Ride Setup"
			image="/images/cards/roller.jpg"
			imageAlt="spinning on roller; Klasická kola umístěna na otáčecí válce a zapojena na měřič rychlosti."
		>
			<SetupFormControl>
				<InputLabel id="select-resistance-mode" shrink={true}>
					Resistance Mode
				</InputLabel>
				<Select
					variant="standard"
					label="Resistance Mode"
					labelId="select-resistance-mode"
					id="resistance-mode-select"
					notched={true}
					value={resistanceMode}
					onChange={handleResistanceModeChange}
				>
					<MenuItem value={'basic'}>Basic resistance</MenuItem>
					<MenuItem value={'power'}>Power</MenuItem>
					<MenuItem value={'slope'}>Slope</MenuItem>
				</Select>
			</SetupFormControl>
			<br />
			<SetupFormControl>
				<InputLabel id="auto-split-select-label" shrink={true}>
					Auto Split
				</InputLabel>
				<Select
					variant="standard"
					label="Auto Split"
					labelId="auto-split-select-label"
					id="auto-slit-select"
					notched={true}
					value={autoSplitMode}
					onChange={handleAutoSplitChange}
				>
					<MenuItem value={'disabled'}>Disabled</MenuItem>
					<MenuItem value={'distance'}>Distance</MenuItem>
					<MenuItem value={'time'}>Time</MenuItem>
					<MenuItem value={'heartRate'}>Heart rate</MenuItem>
				</Select>
			</SetupFormControl>
			<br />
			<SetupFormControl>
				{
					{
						disabled: '',
						distance: (
							<UnsignedField
								label="Auto Split Distance"
								initialValue={0}
								unit="km"
								setValue={(v) => setAutoSplitValue(`${v}km`)}
							/>
						),
						time: (
							<UnsignedField
								label="Auto Split Time"
								initialValue={0}
								unit="min"
								setValue={(v) => setAutoSplitValue(`${v}min`)}
							/>
						),
						heartRate: (
							<UnsignedField
								label="Auto Split Heart Rate (Rising)"
								initialValue={180}
								unit="BPM"
								setValue={(v) => setAutoSplitValue(`${v}bpm`)}
							/>
						),
					}[autoSplitMode]
				}
			</SetupFormControl>
		</RideSetupCard>
	);
}
