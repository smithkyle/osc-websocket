const { createHash, randomUUID } = nativeRequire('crypto');

const WebSocketClient = require('./WebSocketClient.js')

class OBSWebsocket extends WebSocketClient {
    constructor({ appName = 'OBS Websocket Remote', auth = null, eventSubscriptions = null, callbackAddress = '/OBSCallback', port = 4455 } = {}) {
        super(`ws://localhost:${port}`);
        this.appName = appName;
        this.auth = auth;
        this.eventSubscriptions = eventSubscriptions;
        this.callbackAddress = callbackAddress;
        this.handshakeDone = false;
    }

    _sendHandshake(data) {
        const message = {
            op: 1,
            d: {
                rpcVersion: 1,
            }
        }
        
        if (data.authentication) {
            if (!this.auth || this.auth.length === 0) {
                console.error('OBS Websocket requires authentication, but none specified in OBS Websocket client')
                return;
            }
            const saltedPassword = createHash('sha256')
                .update(this.auth + data.authentication.salt)
                .digest('base64');
            message.d.authentication = createHash('sha256')
                .update(saltedPassword + data.authentication.challenge)
                .digest('base64')
        }

        if (this.eventSubscriptions) { 
            message.eventSubscriptions = this.eventSubscriptions;
        }

        super.send(message);
    }

    onMessage(event) {
        const data = JSON.parse(event.data);

        if (data.op === 0) {
            this._sendHandshake(data.d)
        }
        else if (data.op === 2) {
            this.handshakeDone = true;  // Handshake is now complete
            this._processQueue();  // Now safe to send queued messages
        }

        const eventName = data.d.requestId ? `response:${data.d.requestId}` : "message"
        this.emit(eventName, data)
        
        if (this.callbackAddress && this.callbackAddress.length > 0) {
            receive(this.callbackAddress, data)
        }
    }

    onClose(event) {
        if (event.code === 1000) {
            console.log('Connection closed cleanly - send a command to open a new connection');
            this.handshakeDone = false;
            this.cleanupSocket();
            this.shouldReconnect = true;
        } else {
            console.log('Connection lost, retrying...');
        }

        super.onClose(event);
    }

    async send(message, id = null) {
        if (!this.socket) {
            await this.connect()
        }
        
        if (!id) {
            id = message.d.requestId = randomUUID();
        }

        try {
            super.send(message, id);
        }
        catch (e) {
            console.error('caught error', e)
        }
    }

    close() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.close(1000, 'Unload');
        }
    }
}

module.exports = OBSWebsocket