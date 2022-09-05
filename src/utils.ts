import { color, openRgbColor, rgbDevice } from './rgb';

/** Gets the RGB color that is set on the provided device */
export function getDeviceLedRgbColor(device: rgbDevice): color {
  const ledColor: openRgbColor = device.colors[0];
  const ledRgb: color = [ledColor.red, ledColor.green, ledColor.blue];
  return ledRgb;
}

/** Determines whether the provided color is black */
export function isLedOff(color: color): boolean {
  return color[0] === 0 && color[1] === 0 && color[2] === 0;
}

/** Finds the ID of a device mode by name or returns undefined if the device has no matching mode */
export function findDeviceModeId(device: rgbDevice, modeName: string): number | undefined {
  return device.modes?.find(mode => mode.name?.trim().toLowerCase() === modeName.trim().toLowerCase())?.id;
}

/** Takes an RGB color and builds an array that can be used to set all of the given device's LED's */
export function createDeviceLedConfig(rgbColor: color, device: rgbDevice): openRgbColor[] {
  const ledColor: openRgbColor = {
    red: rgbColor[0],
    green: rgbColor[1],
    blue: rgbColor[2],
  };
  const ledColors: openRgbColor[] = Array(device.colors.length).fill(ledColor);
  return ledColors;
}