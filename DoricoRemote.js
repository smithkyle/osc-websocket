const WebSocketClient = require('./WebSocketClient.js')

class DoricoRemote extends WebSocketClient {
    constructor({ appName = 'Dorico Remote', callbackAddress = '/DoricoCallback' } = {}) {
        super('ws://127.0.0.1:4560');
        this.appName = appName;
        this.callbackAddress = callbackAddress;
        this.sessionToken = null;
        this.handshakeDone = false;
    }

    onOpen() {
        this._sendHandshake();

        super.onOpen();
    }

    _sendHandshake() {
        const message = {
            message: 'connect',
            clientName: this.appName,
            handshakeVersion: '1.0',
        };
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        this.send(message);
    }

    _processHandshake(data) {
        if (data.message === 'sessiontoken' && data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log(`Received sessiontoken: ${this.sessionToken} - completing handshake`);

            const message = {
                message: "acceptsessiontoken",
                sessionToken: this.sessionToken
            }

            this.send(message);
        }
        else if (data.message === 'response' && data.code === 'kConnected') {
            console.log(`Handshake complete for ${this.appName}`);
            this.handshakeDone = true;  // Handshake is now complete
            this._processQueue();  // Now safe to send queued messages
        }
    }

    onMessage(data) {
        if (!this.handshakeDone && data.message === 'sessiontoken') {
            this._processHandshake(data);
        }
        
        super.onMessage(data);
        
        if (this.callbackAddress && this.callbackAddress.length > 0) {
            receive(this.callbackAddress, data)
        }
    }
}

module.exports = DoricoRemote;