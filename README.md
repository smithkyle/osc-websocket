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

## Adding Custom Buttons

1. Enable the `Editor` by selecting the 3 dots menu > Editor > Enabled (checked) OR by pressing Cmd/Ctrl + E
2. Add a button by right clicking on the canvas > Add Widget > Basics > add button
3. Set the following properties for the button:
   - `button`
      - `on`: enter one of:
         - (Sibelius) a comma-separated list of Command IDs
         - (Sibelius) a plugin name (executing the plugin's default Run() method) **
         - (Sibelius) a plugin JSON object to execute arbitrary plugin methods **
         - (Dorico) a Dorico JSON message or an array of Dorico JSON messages
   - `osc`
      - `address`: enter one of:
         - `/SibeliusConnect/command` if sending Command IDs
         - `/SibeliusConnect/plugin` if invoking a plugin **
         - `/SibeliusConnect` if sending a raw Sibelius Connect JSON message (per the [Sibelius Manuscript Reference Documentation](https://resources.avid.com/SupportFiles/Sibelius/2024.10/ManuScript_Language_Guide.pdf])) ***
         - `/DoricoRemote` if sending a request to Dorico
      - `send`: `localhost:8080`

   _** NOTE: if executing Sibelius plugins, the plugin name **MUST** be added to the SibeliusConnect websocket instance in `customModule.js` BEFORE starting OpenStageControl, i.e.:_

   ```javascript
      global.SibeliusConnect = new SibeliusConnect({ plugins: ['PositionRehearsalMarks'] })
   ```

## Additional Notes
The `ws` NPM package is bundled with this custom module to negate the need for having NPM installed.
