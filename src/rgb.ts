// A color (e.g. an RGB or HSV color made up of its 3 channel values)
export type color = [number, number, number];

// A color object as used by the OpenRGB SDK
export interface openRgbColor {
    red: number;
    green: number;
    blue: number;
}

// Describes a device as returned by the OpenRGB SDK
export interface rgbDevice {
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
            value: openRgbColor;
        }
    ];
    colors: openRgbColor[];
    modes?: any[];
    zones?: any[];
    [key: string]: any;
}

// Describes a device running the OpenRGB SDK server
export interface rgbServer {
    name: string;
    host: string;
    port: number;
}