/** A color (e.g. an RGB or HSV color made up of its 3 channel values) */
export type Color = [number, number, number];

/** A color object as used by the OpenRGB SDK */
export interface OpenRgbColor {
    red: number;
    green: number;
    blue: number;
}

/** Describes a device as returned by the OpenRGB SDK */
export interface RgbDevice {
    deviceId: number;
    type: number;
    name: string;
    description?: string;
    version?: string;
    serial?: string;
    location: string;
    activeMode?: number;
    leds: [
        {
            name: string;
            value: OpenRgbColor;
        }
    ];
    colors: OpenRgbColor[];
    modes?: any[];
    zones?: any[];
    [key: string]: any;
}

/** Describes a device running the OpenRGB SDK server */
export interface RgbServer {
    name: string;
    host: string;
    port: number;
}

/** State information that HomeKit keeps for accessories */
export interface RgbDeviceStates {
    On: boolean;
    Hue: number;
    Saturation: number;
    Brightness: number;
}

/** Context information stored for accessories */
export interface RgbDeviceContext {
    device: RgbDevice;
    server: RgbServer;
    lastPoweredRgbColor?: Color;
    lastPoweredModeId?: number;
}