const fs = nativeRequire('fs')

const SibeliusConnect = require('SibeliusConnect.js')

const remote = new SibeliusConnect()

module.exports = {

    init: function() {
        remote.connect()
    },

    oscOutFilter: function(data) {
        
        const { address, args, host, port, clientId } = data;
        
        if (address === '/sibeliusConnect') {
            remote.sendMessage({
                'message': 'invokeCommands',
                'commands': [...args.map(arg => arg.value)]
            });
        }

        return { address, args, host, port };
    },

    unload: function() {
        // TODO TODO TODO TODO TODO: move this to the sibeliusConnect
        if (remote.sessionToken !== null) {
            remote.saveSessionToken()
        }
        // remote.close()
    }
};