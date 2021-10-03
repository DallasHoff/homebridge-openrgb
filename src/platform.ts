import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME, DEFAULT_DISCOVERY_INTERVAL, SERVER_CONNECTION_TIMEOUT } from './settings';
import { OpenRgbPlatformAccessory } from './platformAccessory';

import { rgbServer, rgbDevice } from './rgb';
import { Client as OpenRGB } from 'openrgb-sdk';

/**
 * HomebridgePlatform
 * This class is the main constructor for the plugin, this is where it should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class OpenRgbPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public accessories: PlatformAccessory[] = [];

  // track which accessories have registered handlers
  public handlerUuids: string[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to Homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      // check if plugin configuration is valid
      let isConfigValid = true;

      // check servers
      if (Array.isArray(this.config.servers)) {
        for (const server of this.config.servers) {
          const isValidServer = (
            server.name &&
            server.host &&
            server.port &&
            Number.isInteger(server.port)
          );
          if (!isValidServer) {
            this.log.warn('Invalid configuration for server:', server);
            isConfigValid = false;
          }
        }
      } else {
        this.log.warn('No servers were added to the plugin configuration');
        isConfigValid = false;
      }

      // check discoveryInterval
      if (!Number.isInteger(this.config.discoveryInterval)) {
        this.log.warn('discoveryInterval must be set to an integer value');
        isConfigValid = false;
      }

      // discover/register devices as accessories
      if (isConfigValid === true) {
        await this.discoverDevices();
      }
    });
  }

  /**
   * This function is invoked when Homebridge restores cached accessories from disk at startup.
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
    // OpenRGB SDK servers listed in config
    const servers: rgbServer[] = this.config.servers;
    // servers that connected successfully; use index to match to a found device
    const foundServers: rgbServer[] = [];
    // RGB devices reported by found servers
    const foundDevices: rgbDevice[] = [];
    // UUID's of found devices
    const foundUuids: string[] = [];

    // get all devices from all configured servers
    for (const server of servers) {
      this.log.debug('Discovering devices on server:', server.name);
      await this.rgbConnection(server, (client, devices) => {
        devices.forEach(device => {
          this.log.debug('Discovered device:', device.name);
          foundDevices.push(device);
          foundServers.push(server);
        });
      });
    }

    // loop over the discovered devices and register each one if it has not already been registered
    this.log.debug('Registering devices');
    foundDevices.forEach((device, deviceIndex) => {
      // server this device belongs to
      const deviceServer: rgbServer = foundServers[deviceIndex];

      // unique ID for the device
      const uuid = this.genUuid(device);
      foundUuids.push(uuid);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // update the accessory.context
        existingAccessory.context.device = device;
        existingAccessory.context.server = deviceServer;
        this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory if it does not have one yet
        // this class is imported from `platformAccessory.ts`
        if (this.handlerUuids.indexOf(uuid) < 0) {
          this.handlerUuids.push(uuid);
          new OpenRgbPlatformAccessory(this, existingAccessory);
        }
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);
        this.accessories.push(accessory);

        // the `context` property can be used to store any data about the accessory
        accessory.context.device = device;
        accessory.context.server = deviceServer;

        // create the accessory handler for the newly created accessory
        // this class is imported from `platformAccessory.ts`
        if (this.handlerUuids.indexOf(uuid) < 0) {
          this.handlerUuids.push(uuid);
          new OpenRgbPlatformAccessory(this, accessory);
        }

        // link the accessory to the platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    });

    // remove devices if their server connected but did not report them
    // (unless preserveDisconnected option is set)
    // or if the devices belong to a server that is no longer in the config
    this.accessories = this.accessories.filter(accessory => {
      const accServer: rgbServer = accessory.context.server;
      const accUuid: string = accessory.UUID;

      const serverMatch = (server: rgbServer) => (
        server.name === accServer.name &&
        server.host === accServer.host &&
        server.port === accServer.port
      );
      const isServerInConfig = !!servers.find(serverMatch);
      const isServerConnected = !!foundServers.find(serverMatch);

      if (!isServerInConfig || (isServerConnected && this.config.preserveDisconnected !== true && foundUuids.indexOf(accUuid) < 0)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info('Removing accessory from cache:', accessory.displayName);
        return false;
      }

      return true;
    });

    // set timeout to re-check for devices in case servers go offline and come back online
    // unless discoveryInterval is set to zero
    if (this.config.discoveryInterval !== 0) {
      setTimeout(async () => await this.discoverDevices(), (this.config.discoveryInterval || DEFAULT_DISCOVERY_INTERVAL) * 1000);
    }
  }

  /**
   * For generating a UUID for an RGB device from a globally unique but constant set of inputs
   */
  genUuid(device: rgbDevice): string {
    return this.api.hap.uuid.generate(`${device.name}-${device.serial}-${device.location}`);
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

    // Connect to the server with a timeout
    const timeout = async () => await new Promise((resolve, reject) => setTimeout(() => reject(), SERVER_CONNECTION_TIMEOUT));

    try {
      await Promise.race([client.connect(), timeout()]);
    } catch (err) {
      this.log.warn(`Unable to connect to OpenRGB SDK server at ${serverHost}:${serverPort}.`);
      return 1;
    }

    // Build array of device information
    const devices: rgbDevice[] = [];
    const controllerCount = await client.getControllerCount();

    for (let deviceId = 0; deviceId < controllerCount; deviceId++) {
      const device: rgbDevice = await client.getControllerData(deviceId);
      devices.push(device);
    }

    // Perform supplied action then disconnect
    await action(client, devices);

    await client.disconnect();

    return 0;
  }
}
