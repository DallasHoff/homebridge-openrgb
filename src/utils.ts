import { color, openRgbColor, rgbDevice } from './rgb';

/** Finds the RGB color that is set on the provided device */
export function findDeviceLedRgbColor(device: rgbDevice): color {
  const ledColor: openRgbColor = device.colors[0];
  const ledRgb: color = [ledColor.red, ledColor.green, ledColor.blue];
  return ledRgb;
}

/** Finds whether the provided color is black */
export function isLedOff(color: color): boolean {
  return color[0] === 0 && color[1] === 0 && color[2] === 0;
}

/** Finds the ID of a device mode by name or returns undefined if the device has no matching mode */
export function findDeviceModeId(device: rgbDevice, modeName: string): number | undefined {
  return device.modes?.find(mode => mode.name?.trim().toLowerCase() === modeName.trim().toLowerCase())?.id;
}