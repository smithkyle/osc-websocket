// const fs = nativeRequire('fs')
const path = nativeRequire('path')

const SibeliusConnect = require('SibeliusConnect.js')
const DoricoRemote = require('DoricoRemote.js')

module.exports = {

    init: function() {
        global.SibeliusConnect = new SibeliusConnect({ plugins: ['cmdutils'] })
        // global.SibeliusConnect.connect()

        global.DoricoRemote = new DoricoRemote()
        // global.DoricoRemote.connect()
    },

    oscOutFilter: function(data) {
        
        const { address, args, host, port, clientId } = data;
        
        try {
            if (args.length === 1 && args[0].value === 0) {
                // passthru "off"/0 messages
                return data
            }

            if (address === '/sibelius' || path.dirname(address) === '/sibelius') {
                args.map(arg => {
                    let addr = address
                    arg = arg.value

                    if (arg.startsWith('command:') || arg.startsWith('plugin:')) {
                        addr = arg.substring(0,arg.indexOf(':'))
                        arg = arg.substring(arg.indexOf(':') + 1)
                    }

                    let msg = arg.startsWith('{') ? JSON.parse(arg) : {}

                    if (path.basename(addr) === 'command') {
                        msg.message = 'invokeCommands'
                        msg.commands = arg.split(',').map(v => v.trim())
                    }
                    else if (path.basename(addr) === 'plugin') {
                        msg.message = 'invokePlugin'
                        if (!msg.name || msg.name === '') {
                            const [pluginName, method, ...methodArgs] = arg.split(',')
                            msg.name = pluginName
                            if (method) {
                                msg.method = method
                            }
                            if (methodArgs && methodArgs.length > 0) {
                                msg.args = JSON.parse(`[${methodArgs.join(',').replace(/\\/g, "\\\\")}]`)
                            }
                        }
                    }

                    return msg
                })
                .reduce(async (a, msg) => {
                    await a
                    global.SibeliusConnect.sendMessage(msg)
                    return new Promise(resolve => setTimeout(resolve, 50));
                }, Promise.resolve())
            }
            else if (address === '/dorico') {
                args.forEach(arg => {
                    global.DoricoRemote.send(JSON.parse(arg.value))
                })
            }
        }
        catch (e) {
            receive('/NOTIFY', '^circle-exclamation', `${address} ${args.map(a => a.value).join(' ')}\n\n ${e.toString()}`)
        }
        
        return { address, args, host, port };
    },

};