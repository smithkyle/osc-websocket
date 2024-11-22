// const fs = nativeRequire('fs')
const path = nativeRequire('path')

const SibeliusConnect = require('SibeliusConnect.js')
const DoricoRemote = require('DoricoRemote.js')

module.exports = {

    init: function() {
        global.SibeliusConnect = new SibeliusConnect({plugins: ['PositionRehearsalMarks']})
        // global.SibeliusConnect.connect()

        global.DoricoRemote = new DoricoRemote()
        // global.DoricoRemote.connect()
    },

    oscOutFilter: function(data) {
        
        const { address, args, host, port, clientId } = data;
        
        try {
            // @TODO REMOVE
            if (args[0].value === 0) {
                return data
            }
            if (address === '/SibeliusConnect') {
                args.forEach(arg => {
                    const msg = JSON.parse(arg.value)
                    global.SibeliusConnect.sendMessage(msg)
                })
            }
            if (address === '/SibeliusConnect/command') {
                // @TODO: accept comma-separated list, i.e. /SibeliusConnect/command/select_all,delete
                const commands = args.reduce((acc, cur) => [...acc, ...cur.value.split(',')], [])
                // global.SibeliusConnect.sendMessage({
                //     'message': 'invokeCommands',
                //     'commands': [...args.map(arg => arg.value)]
                // });
                console.log(`commands: ${commands}`)
                console.log(commands)
            }
            if (address === '/SibeliusConnect/plugin') {
                args.forEach(arg => {
                    const plugin = arg.value[0] === '{' ? JSON.parse(arg.value) : { name: arg.value }
                    const msg = {
                        'message' : 'invokePlugin',
                        'name': plugin.name
                    }
                    if (plugin.method) {
                        msg.method = plugin.method
                    }
                    if (plugin.args) {
                        msg.args = plugin.args
                    }
                    global.SibeliusConnect.sendMessage(msg);
                })
            }
            else if (address === '/DoricoRemote') {
                args.forEach(arg => {
                    global.DoricoRemote.sendMessage(JSON.parse(arg.value))
                })
            }
        }
        catch (e) {
            console.log(e)
        }
        
        return { address, args, host, port };
    },

};