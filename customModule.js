const fs = nativeRequire('fs')

const SibeliusConnect = require('SibeliusConnect.js')
const DoricoRemote = require('DoricoRemote.js')

module.exports = {

    init: function() {
        global.SibeliusConnect = new SibeliusConnect()
        // global.SibeliusConnect.connect()

        global.DoricoRemote = new DoricoRemote()
        global.DoricoRemote.connect()
    },

    oscOutFilter: function(data) {
        
        const { address, args, host, port, clientId } = data;
        
        if (address === '/sibeliusConnect') {
            global.SibeliusConnect.sendMessage({
                'message': 'invokeCommands',
                'commands': [...args.map(arg => arg.value)]
            });
        }
        else if (address === '/doricoRemote') {
            args.forEach(arg => {
                global.DoricoRemote.sendMessage(JSON.parse(arg.value))
            })
        }
        
        return { address, args, host, port };
    },

};