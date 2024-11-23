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
            if (address === '/SibeliusConnect') {
                args.forEach(arg => {
                    const msg = JSON.parse(arg.value)
                    global.SibeliusConnect.sendMessage(msg)
                })
            }
            else if (path.dirname(address) === '/SibeliusConnect') {
                if (path.basename(address) === 'command') {
                    const commands = args.reduce((acc, cur) => [...acc, ...cur.value.split(',')], [])
                    global.SibeliusConnect.sendMessage({
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
                            msg.method = plugin.method
                        }
                        if (plugin.args) {
                            msg.args = plugin.args
                        }
                        global.SibeliusConnect.sendMessage(msg);
                    })
                }
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