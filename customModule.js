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

            if (address === '/SibeliusConnect' || path.dirname(address) === '/SibeliusConnect') {
                let addr = address // don't mess with address - is this actually needed?
                args.map(arg => {
                    arg = arg.value

                    if (addr === '/SibeliusConnect' || path.dirname(addr) === '/SibeliusConnect') {
                        
                        if (arg[0] === '/') {
                            // we're macroing - change the address here?
                            addr = arg.substring(0, arg.indexOf(' '))
                            arg = arg.substring(arg.indexOf(' ') + 1)
                        }

                        let msg = arg[0] === '{' ? JSON.parse(arg) : {}

                        if (path.basename(addr) === 'command') {
                            msg.message = 'invokeCommands'
                            msg.commands = arg.split(',').map(v => v.trim())
                        }
                        else if (path.basename(addr) === 'plugin') {
                            msg.message = 'invokePlugin'
                            if (!msg.name || msg.name === '') {
                                [pluginName, method, ...methodArgs] = arg.split(',')
                                msg.name = pluginName
                                if (method) {
                                    msg.method = method
                                }
                                if (args) {
                                    msg.args = methodArgs
                                }
                            }
                        }
                        
                        return msg
                    }
                })
                .reduce(async (a, msg) => {
                    await a
                    global.SibeliusConnect.sendMessage(msg)
                    return new Promise(resolve => setTimeout(resolve, 10));
                }, Promise.resolve())
            }
            else if (address === '/DoricoRemote') {
                args.forEach(arg => {
                    global.DoricoRemote.sendMessage(JSON.parse(arg.value))
                })
            }
        }
        catch (e) {
            receive('/NOTIFY', '^circle-exclamation', `${address} ${args.map(a => a.value).join(' ')}\n\n ${e.toString()}`)
        }
        
        return { address, args, host, port };
    },

};