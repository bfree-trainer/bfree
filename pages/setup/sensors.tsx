import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconBike from '@mui/icons-material/DirectionsBike';
import IconCadence from '@mui/icons-material/FlipCameraAndroid';
import IconHeart from '@mui/icons-material/Favorite';
import IconPower from '@mui/icons-material/OfflineBolt';
import IconSpeed from '@mui/icons-material/Speed';
import Title from '../../components/Title';
import Typography from '@mui/material/Typography';
import { green } from '@mui/material/colors';
import SxPropsTheme from '../../lib/SxPropsTheme';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import MyHead from '../../components/MyHead';
import { BluetoothServiceType, pairDevice, readBatteryLevel, startBatteryLevelNotifications } from '../../lib/ble';
import { startCyclingPowerMeasurementNotifications } from '../../lib/ble/cpp';
import { startCyclingSpeedAndCadenceMeasurementNotifications } from '../../lib/ble/cscp';
import { startHRMNotifications } from '../../lib/ble/hrm';
import { createSmartTrainerController } from '../../lib/ble/trainer';
import BatteryLevel from '../../components/BatteryLevel';
import SensorValue from '../../components/SensorValue';
import { TrainerCalibrationModal } from '../../components/TrainerControl';
import { useGlobalState, SensorType, getGlobalState } from '../../lib/global';

const PREFIX = 'sensors';
const classes = {
	sensorValue: `${PREFIX}-sensorValue`,
};

const StyledContainer = styled(Container)(({ theme }) => ({
	[`& .${classes.sensorValue}`]: {
		position: 'relative',
		marginBottom: '1em',
		width: '300px',
	},
}));

type Severity = 'error' | 'info' | 'success' | 'warning';

type InfoMessage = {
	message: string;
	severity: Severity;
};

const buttonProgressStyle: SxPropsTheme = {
	color: green[500],
	position: 'absolute',
	top: '50%',
	left: '50%',
	marginTop: -12,
	marginLeft: -12,
};
const iconStyle: SxPropsTheme = {
	fontSize: '18px !important',
};

function ActionButton({
	wait,
	onClick,
	disabled,
	children,
}: {
	wait: boolean;
	onClick?: () => void;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<Box>
			<Button disabled={wait || disabled} variant="contained" onClick={onClick}>
				{children}
				{wait && <CircularProgress size={24} sx={buttonProgressStyle} />}
			</Button>
		</Box>
	);
}

function SensorStatus({ wait, severity, children }: { wait?: boolean; severity: Severity; children: ReactNode }) {
	return (
		<CardContent>
			<Alert severity={severity}>{children}</Alert>
		</CardContent>
	);
}

function Sensor(props: { children: ReactNode; sensorType: SensorType }) {
	const pairedWithMessage = (btd): InfoMessage => ({
		message: btd ? `Paired with\n${btd.device.name}` : 'Not configured',
		severity: 'info',
	});
	const [btAvailable, setBtAvailable] = useState(false);
	const [pairingRequest, setPairingRequest] = useState(false);
	const [isPairing, setIsPairing] = useState(false);
	// @ts-ignore
	const [btDevice, setBtDevice] = useGlobalState(`btDevice_${props.sensorType}`);
	// @ts-ignore
	const [_GloblBatteryLevel, setGloblBatteryLevel] = useGlobalState(`batt_${props.sensorType}`);
	let [info, setInfo] = useState<InfoMessage>(pairedWithMessage(btDevice));
	const [batteryLevel, setBatteryLevel] = useState(-1);
	const [sensorValue, setSensorValue] = useGlobalState(props.sensorType);
	const [smartTrainerControl, setSmartTrainerControl] = useGlobalState('smart_trainer_control');
	const [showSmartTrainerCalibrationModal, setShowSmartTrainerCalibrationModal] = useState(false);

	const unpairDevice = useCallback(() => {
		if (btDevice) {
			if (btDevice.device.gatt.connected) {
				btDevice.disconnect();
			}
			setBtDevice(null);
			setInfo(pairedWithMessage(null));
			setBatteryLevel(-1);
			setSensorValue(null);
			if (props.sensorType === 'smart_trainer') {
				setSmartTrainerControl(null);
			}
			setIsPairing(false);
		}
	}, [btDevice, props.sensorType, setBtDevice, setSensorValue, setSmartTrainerControl]);

	useEffect(() => {
		navigator.bluetooth
			.getAvailability()
			.then((v) => setBtAvailable(v))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (pairingRequest) {
			setPairingRequest(false);
			setIsPairing(true);
			if (btDevice && btDevice.device.gatt.connected) {
				unpairDevice();
			}

			(async () => {
				try {
					setInfo({ message: 'Requesting BLE Device...', severity: 'info' });

					/* Map internal sensor type to Bt service name */
					const srvMap: { [key: string]: BluetoothServiceType } = {
						cycling_cadence: 'cycling_speed_and_cadence',
						cycling_power: 'cycling_power',
						cycling_speed: 'cycling_speed_and_cadence',
						cycling_speed_and_cadence: 'cycling_speed_and_cadence',
						heart_rate: 'heart_rate',
						smart_trainer: '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e', // TACX ANT+ FE-C over BLE
					};

					const newBtDevice = await pairDevice(
						srvMap[props.sensorType],
						async ({ device, server }) => {
							// Get battery level just once
							try {
								setBatteryLevel(await readBatteryLevel(server));
								startBatteryLevelNotifications(server, setGloblBatteryLevel);
							} catch (err) {
								console.log(`Device ${device.name} doesn't support battery_level`);
							}

							try {
								if (props.sensorType === 'cycling_power') {
									await startCyclingPowerMeasurementNotifications(server, setSensorValue);
								} else if (
									['cycling_speed_and_cadence', 'cycling_cadence', 'cycling_speed'].includes(
										props.sensorType
									)
								) {
									await startCyclingSpeedAndCadenceMeasurementNotifications(server, setSensorValue);
								} else if (props.sensorType === 'heart_rate') {
									await startHRMNotifications(server, setSensorValue);
								} else if (props.sensorType === 'smart_trainer') {
									const controller = await createSmartTrainerController(server, setSensorValue);
									await controller.startNotifications();

									const { weight: userWeightKg } = getGlobalState('rider');
									const { weight: bikeWeightKg, wheelCircumference } = getGlobalState('bike');
									await controller.sendUserConfiguration({
										userWeightKg,
										bikeWeightKg,
										wheelCircumference,
									});

									setSmartTrainerControl(controller);
								} else {
									console.error('Invalid sensor type');
								}
							} catch (err) {
								setInfo({ message: `${err}`, severity: 'error' });
							}
						},
						() => {
							// Unpair if we can't reconnect.
							unpairDevice();
						}
					);

					const { device } = newBtDevice;
					console.log(`> Name: ${device.name}\n> Id: ${device.id}\n> Connected: ${device.gatt.connected}`);
					setInfo(pairedWithMessage(newBtDevice));
					setBtDevice(newBtDevice);
				} catch (err) {
					const msg = `${err}`;
					if (msg.startsWith('NotFoundError: User cancelled')) {
						setInfo({ message: 'Pairing cancelled', severity: 'warning' });
					} else {
						setInfo({ message: `${err}`, severity: 'error' });
					}
				} finally {
					setIsPairing(false);
				}
			})();
		}
	}, [btDevice, pairingRequest, props.sensorType, setBtDevice, setGloblBatteryLevel, setSensorValue, setSmartTrainerControl, unpairDevice]);

	const scanDevices = () => {
		setPairingRequest(true);
	};

	return (
		<Grid item xs="auto">
			<Card variant="outlined">
				<CardContent sx={{ height: '15em' }}>
					<Box sx={{ position: 'relative' }}>
						<Box sx={{ position: 'absolute', width: '1em', right: 0.5, zIndex: 10 }}>
							{batteryLevel >= 0 ? <BatteryLevel batteryLevel={batteryLevel} /> : ''}
						</Box>
					</Box>
					<Typography gutterBottom variant="h5" component="h2">
						{props.children}
					</Typography>
					<SensorValue
						sensorType={props.sensorType}
						sensorValue={sensorValue}
						className={classes.sensorValue}
					/>
					<Box>
						<SensorStatus wait={isPairing} severity={info.severity}>
							{info.message.split('\n').map((line, i) => (
								<span key={i}>
									{`${line}`}
									<br />
								</span>
							))}
						</SensorStatus>
					</Box>
					{props.sensorType === 'smart_trainer' ? (
						<TrainerCalibrationModal
							open={showSmartTrainerCalibrationModal}
							onClose={() => setShowSmartTrainerCalibrationModal(false)}
						/>
					) : (
						''
					)}
				</CardContent>
				<CardActions>
					<ActionButton wait={isPairing} disabled={!btAvailable} onClick={scanDevices}>
						Scan
					</ActionButton>
					<ActionButton wait={false} disabled={!btDevice} onClick={unpairDevice}>
						Unpair
					</ActionButton>
					{props.sensorType === 'smart_trainer' ? (
						<ActionButton
							wait={!smartTrainerControl && !!btDevice}
							disabled={!btDevice}
							onClick={() => setShowSmartTrainerCalibrationModal(true)}
						>
							Calibrate
						</ActionButton>
					) : (
						''
					)}
				</CardActions>
			</Card>
		</Grid>
	);
}

export default function SetupSensors() {
	return (
		<StyledContainer maxWidth="md">
			<MyHead title="Senors" />
			<Box>
				<Title href="/setup">Sensors</Title>
				<p>Connect your smart trainer, HRM, and other sensors using BLE.</p>

				<Grid container direction="row" alignItems="center" spacing={2}>
					<Sensor sensorType="smart_trainer">
						<IconBike sx={iconStyle} /> Smart Trainer
					</Sensor>
					<Sensor sensorType="cycling_power">
						<IconPower sx={iconStyle} /> Power
					</Sensor>
					<Sensor sensorType="cycling_speed_and_cadence">
						<IconCadence sx={iconStyle} /> Speed &amp; Cadence
					</Sensor>
					<Sensor sensorType="cycling_speed">
						<IconSpeed sx={iconStyle} /> Speed
					</Sensor>
					<Sensor sensorType="cycling_cadence">
						<IconCadence sx={iconStyle} /> Cadence
					</Sensor>
					<Sensor sensorType="heart_rate">
						<IconHeart sx={iconStyle} /> HRM
					</Sensor>
				</Grid>
			</Box>
		</StyledContainer>
	);
}
