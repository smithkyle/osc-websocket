const fs = nativeRequire('fs');
const WebSocket = nativeRequire('ws');

class SibeliusConnect {
    constructor(appName = 'Sibelius Connect Remote', port = 1898, plugins = []) {
        this.appName = appName;
        this.url = `ws://localhost:${port}`;
        this.plugins = plugins;
        this.socket = null;
        this.sessionToken = null;
        this.retryTimeout = 2000;
        this.messageQueue = [];
        this.isConnecting = false;
        this.isReconnecting = false;
        this.handshakeDone = false;
    }

    connect() {
        console.log('Connecting')

        if (this.isConnecting) {
            return;
        }
        this.isConnecting = true;

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('Connected - initiating handshake')
            this.isReconnecting = false;
            this.sendHandshake();
        };

        this.socket.onmessage = (event) => {
            // console.log('Received message:', event.data);
            const data = JSON.parse(event.data);

            if ('sessionToken' in data) {
                this.sessionToken = data.sessionToken;
                console.log('Received sessionToken:', this.sessionToken);
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error.message);
        };

        this.socket.onclose = (event) => {
            if (event.code === 1000) {
                console.log('WebSocket connection closed cleanly');
                this.sessionToken = null
            } else {
                if (!this.isConnecting) {
                    console.log('WebSocket closed - reconnecting')
                    this.retry();
                }
            }
        };

        this.isConnecting = this.isReconnecting = false;
    }

    sendHandshake() {
        console.log('Shaking hands')

        const message = {
            handshakeVersion: '1.0',
            clientName: this.appName,
            message: 'connect',
        };
        
        if (this.sessionToken !== null && !this.connected) {
            message.sessionToken = this.sessionToken;
        }
        else if (this.plugins.length > 0) {
            message.plugins = this.plugins
        }
        
        this.socket.send(JSON.stringify(message));
        this.handshakeDone = true;

        // Send queued messages after connect message is sent
        // this.sendQueuedMessages();
    }

    sendQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.send(JSON.stringify(message));
        }
    }

    sendMessage(message) {
        this.messageQueue.push(message);
        console.log(message)
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (!this.isConnecting && !this.isReconnecting) {
                this.connect();
            }
        } else {
            if (this.handshakeDone) {
                this.sendQueuedMessages();
            }
        }
    }

    retry() {
        console.log('Attempting to reconnect')

        if (!this.isReconnecting) {
            this.isReconnecting = true;
            setTimeout(() => {
                this.connect();
            }, this.retryTimeout);
        }
    }

    close() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close(1000, 'Unload');
        }
    }
}

module.exports = SibeliusConnect;
