import { Color, OpenRgbColor, RgbDevice, RgbDeviceStates } from './rgb';

/** Gets the RGB color that is set on the provided device */
export function getDeviceLedRgbColor(device: RgbDevice): Color {
  const ledColor: OpenRgbColor = device?.colors?.[0];
  const ledRgb: Color = [
    ledColor?.red ?? 0,
    ledColor?.green ?? 0,
    ledColor?.blue ?? 0,
  ];
  return ledRgb;
}

/** Gets the HSV color that is currently represented by an accessory's state */
export function getStateHsvColor(states: RgbDeviceStates): Color {
  return [states.Hue, states.Saturation, states.Brightness];
}

/** Determines whether the provided color is black */
export function isLedOff(color: Color): boolean {
  return color[0] === 0 && color[1] === 0 && color[2] === 0;
}

/** Finds the ID of a device mode by name or returns undefined if the device has no matching mode */
export function findDeviceModeId(device: RgbDevice, modeName: string): number | undefined {
  return device.modes?.find(mode => mode.name?.trim().toLowerCase() === modeName.trim().toLowerCase())?.id;
}

/** Takes an RGB color and builds an array that can be used to set all of the given device's LED's */
export function createDeviceLedConfig(rgbColor: Color, device: RgbDevice): OpenRgbColor[] {
  const ledColor: OpenRgbColor = {
    red: rgbColor[0],
    green: rgbColor[1],
    blue: rgbColor[2],
  };
  const ledColors: OpenRgbColor[] = Array(device.colors.length).fill(ledColor);
  return ledColors;
}