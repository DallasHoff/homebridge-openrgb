/** This is the name of the platform that users will use to register the plugin in the Homebridge config.json */
export const PLATFORM_NAME = 'OpenRgbPlatform';

/** This must match the name of the plugin as defined in package.json */
export const PLUGIN_NAME = 'homebridge-openrgb';

/** Name used for devices when OpenRGB does not provide a name for them */
export const DEFAULT_DEVICE_NAME = 'RGB Device';

/** Fallback value to use if config.discoveryInterval is left empty */
export const DEFAULT_DISCOVERY_INTERVAL = 60;

/** Timeout (in milliseconds) to use when attempting to connect to a server */
export const SERVER_CONNECTION_TIMEOUT = 3000;

/** Send updates after this delay (milliseconds) to mitigate race condition from
 * HomeKit setting multiple characteristics at the same time */
export const CHARACTERISTIC_UPDATE_DELAY = 50;