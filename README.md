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

## Adding Custom Buttons (Sibelius)

1. Enable the `Editor` by selecting the 3 dots menu > Editor > Enabled (checked) OR by pressing Cmd/Ctrl + E
2. Add a button by right clicking on the canvas > Add Widget > Basics > add button
3. There are a variety of methods for sending commands to Sibelius (assuming `localhost` with default port `8080`):

| Method | `button > on`                       | `osc > address` | `osc > target`   |
| :-------------: | :---------------------------------- | :-------------: | :------------:   |
| Command(s) (explicit)  | comma-separated list of Command IDs | `/sibelius/command` | `localhost:8080` |
| Command(s) (implicit)  | `command:Command1,Command2,etc...` | `/sibelius` | `localhost:8080` |
| Plugin (explicit - simple)** | PluginName (executes default Run() method) | `/sibelius/plugin` | `localhost:8080` |
| Plugin (explicit - advanced)** | PluginName,MethodName,arg1,"arg2",... | `/sibelius/plugin` | `localhost:8080` |
| Plugin (implicit)** | `plugin:PluginName,MethodName,arg1,"Arg 2",...` | `/sibelius` | `localhost:8080` |
| Plugin (JSON)** | An `InvokePlugin` JSON object (without `message` key)  | `/sibelius` | `localhost:8080` |
| Command or Plugin (raw JSON) | A raw SibeliusConnect JSON object | `/sibelius` | `localhost:8080` |

   >_** NOTE: if executing Sibelius plugins, the plugin name **MUST** be added to the SibeliusConnect websocket instance in `customModule.js` BEFORE starting OpenStageControl, i.e.:_
   ```javascript
   global.SibeliusConnect = new SibeliusConnect({ plugins: ['cmdutils'] })
   ```

## Macros
Macros can be sent via a variety of methods:
- Commands/plugins can be combined into an array or semicolon-separated string. For example, [Bob Zawalich's **Add Wildcards Title Subtitle Composer Lyricist** macro](https://bobzawalich.com/wp-content/uploads/2021/08/Some-Current-Sibelius-Command-Macros.pdf)
   - Also set `osc > address: /sibelius` and `osc > target: localhost:8080`

   `button > on` (as an array - can mix implicit command/plugin strings and raw SibeliusConnect JSON objects):

      [
         "plugin:cmdutils,GoToFirstBar_cu",
         "plugin:cmdutils,TextStyleDefaultForCommands_cu,\"text.system.page_aligned.title\"",
         "plugin:cmdutils,Add_Text_cu,\"\\$Title\\\"",
         "plugin:cmdutils,TextStyleDefaultForCommands_cu,\"text.system.page_aligned.subtitle\"",
         "plugin:cmdutils,Add_Text_cu,\"\\$Subtitle\\\"",
         "plugin:cmdutils,TextStyleDefaultForCommands_cu,\"text.system.page_aligned.composer\"",
         "plugin:cmdutils,Add_Text_cu,\"\\$Composer\\\"",
         "plugin:cmdutils,TextStyleDefaultForCommands_cu,\"text.system.page_aligned.lyricist\"",
         "plugin:cmdutils,Add_Text_cu,\"\\$Lyricist\\\"",
         "command:goto_selection_start",
         "plugin:cmdutils,MessageBox_cu,\"Please fill in the Score Info fields for the title, subtitle, composer, and lyricist, then click the Ribbon Home tab.\"",
         "command:score_info"
      ]

   _NOTE: Some characters need to be escaped due to javascript syntax. Backslashes always need to be escaped (i.e. `\\` will result in `\` when the message is actually sent). Single quoted strings will automatically be converted to double quoted strings (with proper double quote escaping, as above)_
   
   `button > on` (as a semicolon-separated string):

      plugin:cmdutils,GoToFirstBar_cu;
      plugin:cmdutils,TextStyleDefaultForCommands_cu,"text.system.page_aligned.title";
      plugin:cmdutils,Add_Text_cu,"\$Title\";
      plugin:cmdutils,TextStyleDefaultForCommands_cu,"text.system.page_aligned.subtitle";
      plugin:cmdutils,Add_Text_cu,"\$Subtitle\";
      plugin:cmdutils,TextStyleDefaultForCommands_cu,"text.system.page_aligned.composer";
      plugin:cmdutils,Add_Text_cu,"\$Composer\";
      plugin:cmdutils,TextStyleDefaultForCommands_cu,"text.system.page_aligned.lyricist";
      plugin:cmdutils,Add_Text_cu,"\$Lyricist\";
      command:goto_selection_start;
      plugin:cmdutils,MessageBox_cu,"Please fill in the Score Info fields for the title, subtitle, composer, and lyricist, then click the Ribbon Home tab.";
      command:score_info

- Implicit AND Explicit commands/plugins can also be sent as a macro using the built-in `/SibeliusConnect` macro builder. This is done by setting the widget's:

   `value > linkId: >>sibelius`
   
   It has the following benefits:
   - Negates the need to set the widget's `osc > address` or `osc > target`
   - Ability to reference other widget's addresses that also send Sibelius Connect command/plugin mesages (i.e. `command:voice3;/filterRests`, where the `filterRests` widget sends its own command/plugin message)

## Additional Notes
The `ws` NPM package is bundled with this custom module to negate the need for having NPM installed.

## Roadmap
- [ ] Cleanup interface
- [ ] Fix reconnect websocket issues
- [ ] Allow other OSC apps to send websocket messages via the custom module