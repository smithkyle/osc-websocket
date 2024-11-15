const WebSocketClient = require('./WebSocketClient.js')

class SibeliusConnect extends WebSocketClient {
    constructor(appName = 'Sibelius Connect Remote', port = 1898, plugins = []) {
        super(`ws://localhost:${port}`);
        this.appName = appName;
        this.plugins = plugins;
        this.sessionToken = null;
        this.handshakeDone = false;
    }

    onOpen() {
        this.sendHandshake();
    }

    sendHandshake() {
        const message = {
            handshakeVersion: '1.0',
            clientName: this.appName,
            message: 'connect',
        };

        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        } else if (this.plugins.length > 0) {
            message.plugins = this.plugins;
        }

        this.sendMessage(message);
    }

    onMessage(data) {
        if (data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log('Received sessionToken:', this.sessionToken);
            this.handshakeDone = true;  // Handshake is now complete
            this.sendQueuedMessages();  // Now safe to send queued messages
        }
    }

    onClose(event) {
        if (event.code === 1000) {
            console.log('Connection closed cleanly - send a command to open a new connection');
            this.sessionToken = null;
            this.handshakeDone = false;
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

module.exports = SibeliusConnect