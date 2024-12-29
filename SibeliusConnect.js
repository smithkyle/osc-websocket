const fs = nativeRequire('fs');

const WebSocketClient = require('./WebSocketClient.js');

const SIB_SESSION_FILE = 'sibelius-session.json'

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
        let savedMessageQueue = this.messageQueue;
        this.messageQueue = [];

        this._sendHandshake();

        this.messageQueue = savedMessageQueue;
        savedMessageQueue = []
        
        super.onOpen(resolve);
    }

    _sendHandshake() {
        const message = {
            handshakeVersion: '1.0',
            clientName: this.appName,
            message: 'connect',
        };

        const sessionData = loadJSON(SIB_SESSION_FILE, (e) => {
            console.log(`${SIB_SESSION_FILE} not found - starting new session`)
        });
        this.sessionToken = sessionData?.sessionToken;

        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        } else if (this.plugins.length > 0) {
            // We can't send a new list of plugins unless we're starting a new session
            message.plugins = this.plugins;
        }

        super.send(message);

        if (message.sessionToken) {
            // Sibelius doesn't send a response if reconnecting with a sessionToken,
            // so we will simulate receiving the sessionToken again
            this.onMessage({ data: JSON.stringify(sessionData) })
        }
    }

    _processHandshake(data) {
        console.log(data)
        if (data.sessionToken) {
            this.sessionToken = data.sessionToken;
            console.log('Received sessionToken:', this.sessionToken);
            saveJSON(SIB_SESSION_FILE, data, (e) => console.log("unable to save sessionToken", e));
            this.handshakeDone = true;
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
            
            this._removeSessionFile(`${__dirname}/${SIB_SESSION_FILE}`);
        }

        super.onClose(event)
    }

    _removeSessionFile(file) {
        if (!fs.existsSync(file)) {
            return;
        }
        fs.unlink(file, (error) => {
            if (error) {
                console.warn(`Error removing ${file}`, error);
                this.shouldReconnect = false;
                return;
            }

            console.log(`Removed ${file}`);
        })
    }

    async send(message) {
        if (!this.socket) {
            this.connect();
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