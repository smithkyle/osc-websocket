const fs = nativeRequire('fs')

const SibeliusConnect = require('SibeliusConnect.js')

module.exports = {

    init: function() {
        global.remote = new SibeliusConnect()
        global.remote.connect()
    },

    oscOutFilter: function(data) {
        
        const { address, args, host, port, clientId } = data;
        
        if (address === '/sibeliusConnect') {
            global.remote.sendMessage({
                'message': 'invokeCommands',
                'commands': [...args.map(arg => arg.value)]
            });
        }
        
        return { address, args, host, port };
    },

};