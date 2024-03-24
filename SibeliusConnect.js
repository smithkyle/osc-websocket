const fs = nativeRequire('fs');
const WebSocket = nativeRequire('ws');

class SibeliusConnect {
    constructor(appName = 'Sibelius Connect Remote', port = 1898, plugins = []) {
        this.appName = appName;
        this.url = `ws://localhost:${port}`;
        this.plugins = plugins;
        this.socket = null;
        this.sessionToken = null;
        this.sessionTokenFile = 'sibeliusSessionToken.json';
        this.retryTimeout = 2000;
        this.messageQueue = [];
        this.isConnecting = false;
        this.handshakeDone = false;
    }

    connect() {
        if (this.isConnecting) {
            return;
        }
        this.isConnecting = true;

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            this.sendHandshake();
        };

        this.socket.onmessage = (event) => {
            console.log('Received message:', event.data);
            const data = JSON.parse(event.data);

            if ('sessionToken' in data) {
                this.sessionToken = data.sessionToken;
                console.log('Received sessionToken:', this.sessionToken);
                // saveJSON(this.sessionTokenFile, { sessionToken: this.sessionToken });
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onclose = (event) => {
            if (event.code === 1000) {
                console.log('WebSocket connection closed cleanly.');
            } else {
                console.log('closed - reconnecting')
                this.retry();
            }
        };

        this.isConnecting = false;
    }

    sendHandshake() {
        const message = {
            handshakeVersion: '1.0',
            clientName: this.appName,
            message: 'connect',
        };

        this.loadSessionToken();
        if (this.sessionToken !== null && !this.connected) {
            message.sessionToken = this.sessionToken;
        }
        else if (this.plugins.length > 0) {
            message.plugins = this.plugins
        }

        this.socket.send(JSON.stringify(message));
        this.handshakeDone = true; // Set flag indicating connect message has been sent

        // Send queued messages after connect message is sent
        this.sendQueuedMessages();
    }

    sendQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.send(JSON.stringify(message));
        }
    }

    sendMessage(message) {
        this.messageQueue.push(message);
        
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (!this.isConnecting) {
                this.connect();
            }
        } else {
            if (!this.handshakeDone) {
                this.sendHandshake();
            } else {
                this.sendQueuedMessages();
            }
        }
    }

    retry() {
        setTimeout(() => {
            this.connect();
        }, this.retryTimeout);
    }

    close() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close(1000, 'Unload');
        }
        // Remove session token file
        // this.removeSessionTokenFile();
    }

    saveSessionToken() {
        console.log('session token saved')
        saveJSON('sibeliusSessionToken.json', { sessionToken: this.sessionToken });
    }
    
    loadSessionToken() {
        console.log('checking for existing sessionToken')
        const data = loadJSON(this.sessionTokenFile, () => {
            this.sessionToken = null;
        });
        if (data && data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log(`existing sessionToken found: ${this.sessionToken}`)
            this.removeSessionTokenFile()
        }
    }

    removeSessionTokenFile() {
        const filePath = __filename.replace('SibeliusConnect.js', this.sessionTokenFile);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log('Session Token file removed:', filePath);
            } catch (err) {
                console.error('Error removing file:', err);
            }
        }
    }
}

module.exports = SibeliusConnect;
