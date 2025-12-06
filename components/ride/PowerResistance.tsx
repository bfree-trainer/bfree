import TextField from '@mui/material/TextField';
import ResistanceCard from './ResistanceCard';

export type PowerLimits = { min: number; max: number };

export default function PowerResistance({
	limits,
	setLimits,
}: {
	limits: { min: number; max: number };
	setLimits: (limits: PowerLimits) => void;
}) {
	return (
		<ResistanceCard title="Power" image="/images/cards/slope.jpg">
			<TextField
				value={limits.min || 0}
				error={limits.min < 0}
				onChange={
					// @ts-ignore
					(e) => setLimits({ ...limits, min: Number(e.target.value) || 0 })
				}
				id="outlined-basic"
				label="Min"
				variant="outlined"
			/>
			<br />
			<TextField
				value={limits.max || 0}
				error={limits.max <= 0}
				onChange={
					// @ts-ignore
					(e) => setLimits({ ...limits, max: Number(e.target.value) || 0 })
				}
				id="outlined-basic"
				label="Max"
				variant="outlined"
			/>
		</ResistanceCard>
	);
}
