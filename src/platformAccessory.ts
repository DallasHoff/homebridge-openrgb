import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { OpenRgbPlatform } from './platform';

import { color, openRgbColor } from './rgb';
import * as ColorConvert from 'color-convert';
import { findDeviceModeId } from './utils';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory the platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OpenRgbPlatformAccessory {
  private service: Service;

  private states = {
    On: false,
    Hue: 0,
    Saturation: 0,
    Brightness: 0,
  };

  constructor(
    private readonly platform: OpenRgbPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device?.description?.split?.(' ')?.[0] || 'OpenRGB')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.name || 'RGB Device')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.serial || '9876543210');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name || 'RGB Device');

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    // register handlers for the Hue Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))
      .onGet(this.getHue.bind(this));

    // register handlers for the Saturation Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))
      .onGet(this.getSaturation.bind(this));

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));

  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If a device takes time to respond, you should update the status of the device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)

   * If you need to return an error to show the device as "Not Responding" in the Home app:
   * throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
   */

  async getOn(): Promise<CharacteristicValue> {
    const isOn = await this.getLedsOn();
    this.states.On = isOn;
    this.platform.log.debug('Get Characteristic On ->', isOn);
    return isOn;
  }

  async getHue(): Promise<CharacteristicValue> {
    const ledsHsv = await this.getLedsHsv();
    const hue = ledsHsv[0];
    this.states.Hue = hue;
    this.platform.log.debug('Get Characteristic Hue ->', hue);
    return hue;
  }

  async getSaturation(): Promise<CharacteristicValue> {
    const ledsHsv = await this.getLedsHsv();
    const saturation = ledsHsv[1];
    this.states.Saturation = saturation;
    this.platform.log.debug('Get Characteristic Saturation ->', saturation);
    return saturation;
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const ledsHsv = await this.getLedsHsv();
    const brightness = ledsHsv[2];
    this.states.Brightness = brightness;
    this.platform.log.debug('Get Characteristic Brightness ->', brightness);
    return brightness;
  }

  /**
   * Called to get the light color currently set on the device in HSV format.
   * Since this can only return a single color, the function must get just the first LED's
   * color and make the assumption that the others match it.
   * If the computer/SDK server is off, the light will appear to be off, not unresponsive.
   */
  async getLedsHsv(): Promise<color> {
    let colorHsv: color = [0, 0, 0];

    await this.platform.rgbConnection(this.accessory.context.server, (client, devices) => {
      const device = devices.find(d => this.platform.genUuid(d) === this.accessory.UUID);
      if (!device) {
        return;
      }
      const ledColor: openRgbColor = device.colors[0];
      const ledHsv: color = ColorConvert.rgb.hsv(ledColor.red, ledColor.green, ledColor.blue);
      colorHsv = ledHsv;
    });

    return colorHsv;
  }

  /** Called to get whether the light is on or not. */
  async getLedsOn(): Promise<boolean> {
    let isOn = false;

    await this.platform.rgbConnection(this.accessory.context.server, (client, devices) => {
      const device = devices.find(d => this.platform.genUuid(d) === this.accessory.UUID);
      if (!device) {
        return;
      }
      const ledColor: openRgbColor = device.colors[0];
      const ledIsBlack = (ledColor.red + ledColor.green + ledColor.blue) === 0;
      const deviceModeIsOff = findDeviceModeId(device, 'Off') === device.activeMode;
      if (ledIsBlack || deviceModeIsOff) {
        isOn = false;
      } else {
        isOn = true;
      }
    });

    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */

  // Send updates after this delay (milliseconds) to mitigate race condition from
  // HomeKit setting multiple characteristics at the same time
  updateDelay = 50;

  async setOn(value: CharacteristicValue) {
    this.states.On = value as boolean;
    await this.updateLeds();
    this.platform.log.debug('Set Characteristic On ->', value);
  }

  async setHue(value: CharacteristicValue) {
    this.states.Hue = value as number;
    await this.updateLeds();
    this.platform.log.debug('Set Characteristic Hue -> ', value);
  }

  async setSaturation(value: CharacteristicValue) {
    this.states.Saturation = value as number;
    await this.updateLeds();
    this.platform.log.debug('Set Characteristic Saturation -> ', value);
  }

  async setBrightness(value: CharacteristicValue) {
    this.states.Brightness = value as number;
    await this.updateLeds();
    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

  /**
   * Called to send the new light colors to the device when the accessory state is changed in a set handler.
   * This sets all LED's on the device to the same color.
   */
  async updateLeds() {
    await new Promise(resolve => setTimeout(() => resolve(0), this.updateDelay));

    const isOn = this.states.On;
    const newColorHsv: color = [
      this.states.Hue,
      this.states.Saturation,
      this.states.Brightness,
    ];
    const newColorRgb: color = ColorConvert.hsv.rgb(...newColorHsv);

    await this.platform.rgbConnection(this.accessory.context.server, async (client, devices) => {
      const device = devices.find(d => this.platform.genUuid(d) === this.accessory.UUID);
      if (!device) {
        return;
      }

      const offModeId = findDeviceModeId(device, 'Off');
      const directModeId = findDeviceModeId(device, 'Direct');

      const ledColor: openRgbColor = {
        red: newColorRgb[0],
        green: newColorRgb[1],
        blue: newColorRgb[2],
      };
      const ledColors: openRgbColor[] = Array(device.colors.length).fill(ledColor);

      try {
        if (isOn === true && directModeId !== undefined) {
          await client.updateMode(device.deviceId, directModeId);
        } else if (isOn === false && offModeId !== undefined) {
          await client.updateMode(device.deviceId, offModeId);
        }
        await client.updateLeds(device.deviceId, ledColors);
      } catch (err) {
        this.platform.log.warn(`Failed to set light color on device: ${device.name}`);
      }
    });
  }

}
