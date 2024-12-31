// const fs = nativeRequire('fs');

const WebSocketClient = require('./WebSocketClient.js')

const DOR_SESSION_FILE = 'dorico-session.json'

class DoricoRemote extends WebSocketClient {
    constructor({ appName = 'Dorico Remote', callbackAddress = '/DoricoCallback' } = {}) {
        super('ws://127.0.0.1:4560');
        this.appName = appName;
        this.callbackAddress = callbackAddress;
        this.sessionToken = null;
        this.handshakeDone = false;
    }

    onOpen(resolve) {
        this.on('handshakeDone', () => super.onOpen(resolve));

        this._sendHandshake();

        // super.onOpen(resolve);
    }

    _sendHandshake() {
        const message = {
            message: 'connect',
            clientName: this.appName,
            handshakeVersion: '1.0',
        };

        const sessionData = loadJSON(DOR_SESSION_FILE, (e) => {
            console.log(`${DOR_SESSION_FILE} not found - starting new session`)
        });
        this.sessionToken = sessionData?.sessionToken;
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        // use the socket's send method to avoid the messageQueue
        this.socket.send(JSON.stringify(message));
        console.log("Message sent:", message);
    }

    _processHandshake(data) {
        if (data.message === 'sessiontoken' && data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log(`Received sessiontoken: ${this.sessionToken} - completing handshake`);

            const message = {
                message: "acceptsessiontoken",
                sessionToken: this.sessionToken
            }

            this.socket.send(JSON.stringify(message));
            console.log("Message sent:", message);
        }
        else if (data.message === 'response' && data.code === 'kConnected') {
            console.log(`Handshake complete for ${this.appName}`);
            saveJSON(DOR_SESSION_FILE, { sessionToken: this.sessionToken }, (e) => console.log("unable to save sessionToken", e));
            this.handshakeDone = true;
            this.emit('handshakeDone');
        }
    }

    onMessage(event) {
        const data = JSON.parse(event.data);
        
        if (!this.handshakeDone) {
            this._processHandshake(data);
            console.log("Message received:", data);
        }
        else {
            super.onMessage(event);
        }
        
        if (this.callbackAddress && this.callbackAddress.length > 0) {
            receive(this.callbackAddress, data)
        }
    }

    onClose(event) {
        if (event.code === 1000) {
            console.log('Connection closing cleanly - will attempt a fresh connection');
            // this.sessionToken = null;
            // this.handshakeDone = false;
            this.cleanupSocket();
            // this.shouldReconnect = true;
            
            // this._removeSessionFile(`${__dirname}/${DOR_SESSION_FILE}`);
        }

        super.onClose(event)
    }

    // _removeSessionFile(file) {
    //     if (!fs.existsSync(file)) {
    //         return;
    //     }
    //     fs.unlink(file, (error) => {
    //         if (error) {
    //             console.warn(`Error removing ${file}`, error);
    //             this.shouldReconnect = false;
    //             return;
    //         }

    //         console.log(`Removed ${file}`);
    //     })
    // }

    send(message) {
        if (!this.socket) {
            this.connect();
        }

        try {
            super.send(message);
        }
        catch (e) {
            console.error(e.message)
        }
    }
}

module.exports = DoricoRemote;