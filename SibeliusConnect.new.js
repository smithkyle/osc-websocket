const fs = nativeRequire('fs');
const WebSocket = nativeRequire('ws');

class SibeliusConnect {
  constructor(appName = 'Sibelius Connect Remote', port = 1898, plugins = []) {
    this.appName = appName;
    this.url = `ws://localhost:${port}`;
    this.socket = null;
    this.sessionToken = null;
    this.messageQueue = [];
    this.connected = false;
    this.retryTimeout = 2000;
    this.plugins = plugins;
    this.sessionTokenFile = 'sibeliusSessionToken.json';
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('connecting - awaiting handshake')
      this.sendHandshake();
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data)
      if (data.sessionToken) {
        console.log('handshake complete')
        this.connected = true;
        this.processQueue();
        
        this.sessionToken = data.sessionToken;
      }
    };
    
    this.socket.onclose = () => {
      console.log('DISCONNECTED')
      this.connected = false;
      this.retry();
    };
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
    console.log('shaking hands')
    console.log(message)
    this.socket.send(JSON.stringify(message));
  }

  sendMessage(message) {
    if (this.connected) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
      this.connect()
    }
  }

  processQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
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
        console.log('WebSocket connection closed.');
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
