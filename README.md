# OSC-Websocket

This repository contains a custom module that implements a basic websocket client for use with [Open Stage Control](https://openstagecontrol.ammd.net/). It contains two sample implementations of the websocket client:

1. [SibeliusConnect](https://www.avid.com/resource-center/whats-new-in-sibelius-march-2024)
2. Dorico Remote API

## To Use

1. Download and install [Open Stage Control](https://openstagecontrol.ammd.net/download/)
2. Download this repo
3. Configure Open Stage Control with the following parameters:
   - ```load```: ```/path/to/session.json``` (example session using the websocket clients implemented in the custom module)
   - ```custom-module```: ```/path/to/customModule.js```
4. Click the "play" button to open/run the Session.

Once the session is running, pressing any of the buttons will initiate the handshake to connect to either Sibelius or Dorico. Upon first connecting, the respective application will ask you to "approve" the application that is trying to connect. Once connected, you can send commands at will.

Enjoy!

### Additional Notes
The ```ws``` NPM package is bundled with this custom module to negate the need for having NPM installed.
