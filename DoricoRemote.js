const WebSocketClient = require('./WebSocketClient.js')

class DoricoRemote extends WebSocketClient {
    constructor({ appName = 'Dorico Remote', handshakeVersion = '1.0', callbackAddress = '/doricoCallback' } = {}) {
        super('ws://127.0.0.1:4560');
        this.appName = appName;
        this.handshakeVersion = handshakeVersion;
        this.callbackAddress = callbackAddress;
        this.sessionToken = null;
        this.handshakeDone = false;
    }

    onOpen() {
        this.sendHandshake();
    }

    sendHandshake() {
        const message = {
            message: 'connect',
            clientName: this.appName,
            handshakeVersion: this.handshakeVersion,
        };
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        this.sendMessage(message);
    }

    onMessage(data) {
        if (data.message === 'sessiontoken' && data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log(`Received sessiontoken: ${this.sessionToken} - completing handshake`);

            const message = {
                message: "acceptsessiontoken",
                sessionToken: this.sessionToken
            }

            this.sendMessage(message);
        }
        else if (data.message === 'response' && data.code === 'kConnected') {
            console.log(`Handshake complete for ${this.appName}`);
            this.handshakeDone = true;  // Handshake is now complete
            this.sendQueuedMessages();  // Now safe to send queued messages
        }
        
        receive(this.callbackAddress, data)
    }

    onClose(event) {
        if (event.code === 1000) {
            console.log('Connection closed cleanly - send a command to open a new connection');
            // this.sessionToken = null;
            // this.handshakeDone = false;
        } else {
            console.log('Connection lost, retrying...');
        }
    }

    close() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.close(1000, 'Unload');
        }
    }
}

module.exports = DoricoRemote;