import { rgbDevice } from './rgb';

/** Finds the ID of a device mode by name or returns undefined if the device has no matching mode */
export function findDeviceModeId(device: rgbDevice, modeName: string): number | undefined {
  return device.modes?.find(mode => mode.name?.trim().toLowerCase() === modeName.trim().toLowerCase())?.id;
}