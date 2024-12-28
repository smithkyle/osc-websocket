// const fs = nativeRequire('fs')
const path = nativeRequire('path')

const SibeliusConnect = require('SibeliusConnect.js')
const DoricoRemote = require('DoricoRemote.js')
const OBSWebsocket = require('OBSWebsocket.js')

module.exports = {

    init: function() {
        global.SibeliusConnect = new SibeliusConnect()
        // global.SibeliusConnect.connect()

        global.DoricoRemote = new DoricoRemote()
        // global.DoricoRemote.connect()

        const obsSettings = loadJSON('obs-identify.json', () => {}) || {};
        global.OBSWebsocket = new OBSWebsocket(obsSettings)
        global.OBSWebsocket.connect()
    },

    oscInFilter: function(data){
        
        const { address, args, host, port } = data;

        if (address === '/OBSCallback') {
            const request = JSON.parse(args[0].value).d;

            if (!request.requestType) {
                return data;
            }
            let newAddress = '/OBSCallback'//`/${request.requestType.replace('Get','')}`;

            let newArgs = args
            console.log(newAddress)
            switch (newAddress) {
                case 'SceneList':
                    newArgs = request.responseData
                        .scenes.map(scene => {
                            return { type: "s", value: `${scene.sceneUuid}|${scene.sceneName}` }
                        });
                    break;
                case '/InputList':
                    // request.responseData.inputs.forEach(async (input) => {
                    //     const message = {
                    //         "op": 6,
                    //         "d": {
                    //           "requestType": "GetInputVolume",
                    //           "requestId": input.inputUuid,
                    //           "requestData": {
                    //             "inputUuid": input.inputUuid,
                    //           }
                    //         }
                    //       }
                    //     receive('localhost', 8080, '/SET', '/OBSWebsocket', JSON.stringify(message))

                        // await global.OBSWebsocket.send(message, message.d.requestId);
                    // })
                    // newAddress = address
                    break;
            }

            return { address: newAddress, args: newArgs, host, port }
        }

        return data;
    },

    oscOutFilter: function(data) {
        
        const { address, args, host, port, clientId } = data;
        
        try {
            if (args.length === 1 && args[0].value === 0) {
                // passthru "off"/0 messages
                return data
            }
            
            if (address === '/SibeliusConnect') {
                args.forEach(arg => {
                    const msg = JSON.parse(arg.value)
                    global.SibeliusConnect.send(msg)
                })
            }
            else if (path.dirname(address) === '/SibeliusConnect') {
                if (path.basename(address) === 'command') {
                    const commands = args
                        .reduce((acc, cur) => [...acc, ...cur.value.split(',')], [])
                        .map(value => value.trim())
                    global.SibeliusConnect.send({
                        'message': 'invokeCommands',
                        'commands': commands
                    });
                }
                else if (path.basename(address) === 'plugin') {
                    args.forEach(arg => {
                        const plugin = arg.value[0] === '{' ? JSON.parse(arg.value) : { name: arg.value }
                        const msg = {
                            'message' : 'invokePlugin',
                            'name': plugin.name
                        }
                        if (plugin.method) {
                            msg.method = plugin.method;
                        }
                        if (plugin.args) {
                            msg.args = plugin.args
                        }
                        global.SibeliusConnect.send(msg);
                    })
                }
            }
            else if (address === '/DoricoRemote') {
                args.forEach(arg => {
                    global.DoricoRemote.send(JSON.parse(arg.value));
                })
            }
            else if (address.startsWith('/obs')) {
                const message = global.OBSWebsocket.parseToJson(data);
                global.OBSWebsocket.send(message, message.d.requestId);
                return;
                args.forEach(arg => {
                    const message = JSON.parse(arg.value);
                    global.OBSWebsocket.send(message, message.d.requestId);
                })
            }
        }
        catch (e) {
            receive('/NOTIFY', '^circle-exclamation', `${address} ${args.map(a => a.value).join(' ')}\n\n ${e.toString()}`)
        }
        
        return { address, args, host, port };
    },

};