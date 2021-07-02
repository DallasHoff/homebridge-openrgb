import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME, DEFAULT_DISCOVERY_INTERVAL } from './settings';
import { OpenRgbPlatformAccessory } from './platformAccessory';

import { rgbServer, rgbDevice } from './rgb';
import { Client as OpenRGB } from 'openrgb-sdk';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class OpenRgbPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      await this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    const servers: rgbServer[] = this.config.servers;
    const foundDevices: rgbDevice[] = [];
    const deviceServers: rgbServer[] = [];

    // get all devices from all configured servers
    for (const server of servers) {
      this.log.debug('Discovering devices on server:', server.name);
      await this.rgbConnection(server, (client, devices) => {
        devices.forEach(device => {
          this.log.debug('Discovered device:', device.name);
          foundDevices.push(device);
          deviceServers.push(server);
        });
      });
    }

    // loop over the discovered devices and register each one if it has not already been registered
    this.log.debug('Registering devices');
    foundDevices.forEach((device, deviceIndex) => {
      const deviceServer: rgbServer = deviceServers[deviceIndex];

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(`${device.name}-${device.serial}-${device.location}`);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        existingAccessory.context.device = device;
        existingAccessory.context.server = deviceServer;
        this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new OpenRgbPlatformAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;
        accessory.context.server = deviceServer;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new OpenRgbPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    });

    // Set timeout to re-check for devices in case servers go offline and come back online
    // unless discoveryInterval is set to zero
    if (this.config.discoveryInterval !== 0) {
      setTimeout(async () => await this.discoverDevices(), (this.config.discoveryInterval || DEFAULT_DISCOVERY_INTERVAL) * 1000);
    }
  }

  /**
   * For opening connection to OpenRGB SDK server and closing it after performing
   * the action passed as a function which receives the parameters:
   * client (the connection object) and devices (array of RGB device info)
   */
  async rgbConnection(
    server: rgbServer,
    action: (client: any, devices: rgbDevice[]) => void | Promise<void>,
  ): Promise<number> {
    const { name: serverName, host: serverHost, port: serverPort } = server;
    const client = new OpenRGB(serverName, serverPort, serverHost);

    try {
      await client.connect();
    } catch (err) {
      this.log.warn(`Unable to connect to OpenRGB SDK server at ${serverHost}:${serverPort}.`);
      return 1;
    }

    const devices: rgbDevice[] = [];
    const controllerCount = await client.getControllerCount();
    for (let deviceId = 0; deviceId < controllerCount; deviceId++) {
      const device: rgbDevice = await client.getControllerData(deviceId);
      devices.push(device);
    }

    await action(client, devices);

    await client.disconnect();
    return 0;
  }
}
