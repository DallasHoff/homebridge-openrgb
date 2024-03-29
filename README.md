# OpenRGB Homebridge Plugin
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm](https://img.shields.io/npm/v/homebridge-openrgb)](https://www.npmjs.com/package/homebridge-openrgb)
[![Donate](https://img.shields.io/badge/❤-Donate-d61364)](https://www.paypal.com/biz/fund?id=U3ZNM2Q26WJY8)

![](https://repository-images.githubusercontent.com/381840795/6d85ba00-dc10-11eb-8bac-32f841dd423b)

This plugin allows you to integrate [Homebridge](https://homebridge.io/) with the [OpenRGB](https://openrgb.org/index.html) lighting control software on your PC so that you can control the lighting of your PC's components and peripherals with HomeKit. Each RGB device is added to HomeKit as an RGB lightbulb that you can control with Siri, the Home app, scenes, automations, or however else you interact with your HomeKit smart home.

This solution works with PC hardware from the most popular brands like ASUS, Gigabyte, MSI, Corsair, Razer, Logitech, NZXT, and [many more](https://openrgb.org/devices.html).

# Installation

## Install OpenRGB on your PC

OpenRGB is a software project that aims to replace the need to use several different RGB lighting control software programs from multiple vendors, allowing you to control all of your PC components' and peripherals' lighting with just one piece of software.

Follow [OpenRGB's instructions for installing the software](https://gitlab.com/OpenRGBDevelopers/OpenRGB-Wiki/-/blob/stable/User-Documentation/OpenRGB-Windows-Setup-and-Usage.md) on your PC. Then, follow [these instructions](https://gitlab.com/OpenRGBDevelopers/OpenRGB-Wiki/-/blob/stable/User-Documentation/Frequently-Asked-Questions.md#can-i-have-openrgb-start-automatically-when-i-log-in) to configure OpenRGB to start automatically when you turn on your PC. Be sure to make use of the `--server` flag so that the OpenRGB SDK server starts on boot too. This plugin interacts with your PC's lighting through that server.

## Install this Plugin on Homebridge

If you do not already have a Homebridge setup, follow [Homebridge's setup guide](https://github.com/homebridge/homebridge/wiki) to get up and running.

Now, you can install the `homebridge-openrgb` plugin through the Homebridge UI which will help you install and configure the plugin. Alternatively, install the plugin through NPM with: 

    npm install -g homebridge-openrgb

# Configuration

Configure the plugin so that it knows where to connect to your PC(s) running the OpenRGB SDK server. You can do this through the Homebridge UI or add the configuration to the `platforms` array in the configuration file at `~/.homebridge/config.json`

**Configuration Fields:**
* `platform` (string) - Tells Homebridge to use this plugin. Must be set to `OpenRgbPlatform`
* `name` (string) - A name to label this plugin
* `servers` (array) - Each object represents a computer running the OpenRGB SDK server that this plugin should attempt to connect to
    * `name` (string) - A name for this server
    * `host` (string) - The IP address (e.g. 10.0.0.2) or hostname (e.g. my-computer.local) that the OpenRGB SDK Server is running on
    * `port` (integer) - The port number that the OpenRGB SDK Server is set to run on. OpenRGB defaults to using port 6742
* `discoveryInterval` (integer) - How often (in seconds) to check if new devices are available to connect to. Defaults to 60 seconds
* `preserveDisconnected` (boolean) - Set this to `true` to have the plugin keep devices that are disconnected from their server. By default, devices that are not connected when their server is queried are removed from HomeKit, which may mess up your scenes if you have devices such as peripherals which are not always connected to your PC
* `suppressConnectionErrors` (boolean) - Set this to `true` to hide log messages about errors connecting to your PC

Typically, a computer's IP address will change periodically, so I recommend using your PC's hostname to configure this plugin's `host` field. On Windows, you can run the `hostname` command from the command line to view your PC's name. Your hostname will then be that name, lowercase, with `.local` appended to the end. Alternatively, you could configure your router to reserve a specific IP address for your PC and use that in the `host` field.

**Example Configuration:**

    {
      "platforms": [
        {
          "platform": "OpenRgbPlatform",
          "name": "OpenRGB",
          "servers": [
            {
              "name": "John's Computer",
              "host": "johns-computer.local",
              "port": 6742
            },
            {
              "name": "Jane's Computer",
              "host": "janes-computer.local",
              "port": 6742
            }
          ],
          "discoveryInterval": 60,
          "preserveDisconnected": false,
          "suppressConnectionErrors": false
        }
      ]
    }