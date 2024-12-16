const WebSocketClient = require('./WebSocketClient.js')

class SibeliusConnect extends WebSocketClient {
    constructor({ appName = 'Sibelius Connect Remote', callbackAddress = '/SibeliusCallback', port = 1898, plugins = [] } = {}) {
        super(`ws://localhost:${port}`);
        this.appName = appName;
        this.callbackAddress = callbackAddress;
        this.plugins = Array.isArray(plugins) ? plugins : [plugins];
        this.sessionToken = null;
        this.handshakeDone = false;
    }

    onOpen(resolve) {
        // reset the message queue so we don't send a bunch of queued commands
        // on reconnect, and because we need to send the handshake message first
        this.messageQueue = [];
        this._sendHandshake();
        
        super.onOpen(resolve);
    }

    _sendHandshake() {
        const message = {
            handshakeVersion: '1.0',
            clientName: this.appName,
            message: 'connect',
        };

        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        } else if (this.plugins.length > 0) {
            // We can't send a new list of plugins unless we're starting a new session
            message.plugins = this.plugins;
        }

        this.send(message);
    }

    _processHandshake(data) {
        if (data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log('Received sessionToken:', this.sessionToken);
            this.handshakeDone = true;
            this._processQueue();
        }
        else {
            console.error("Handshake failed");
        }
    }

    onMessage(event) {
        const data = JSON.parse(event.data);

        if (!this.handshakeDone && data.sessionToken) {
            this._processHandshake(data);
        }
        
        super.onMessage(event);

        if (this.callbackAddress && this.callbackAddress.length > 0) {
            receive(this.callbackAddress, data);
        }
    }

    onClose(event) {
        if (event.code === 1000) {
            console.log('Connection closing cleanly - will attempt a fresh connection');
            this.sessionToken = null;
            this.handshakeDone = false;
            this.cleanupSocket();
            this.shouldReconnect = true;
        }

        super.onClose(event)
    }

    async send(message) {
        if (!this.socket) {
            await this.connect()
        }

        try {
            super.send(message);
        }
        catch (e) {
            console.error('caught error', e)
        }
    }
}

module.exports = SibeliusConnect