const WebSocket = nativeRequire('ws');

class WebSocketClient {
    constructor(url, retryTimeout = 2000) {
        this.url = url;
        this.retryTimeout = retryTimeout;
        this.socket = null;
        this.messageQueue = [];
        this.isConnecting = false;
        this.isReconnecting = false;
    }

    connect() {
        if (this.isConnecting) return;

        this.isConnecting = true;
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            this.isReconnecting = false;
            this.onOpen();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.onMessage(data);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error.message);
            this.onError(error);
        };

        this.socket.onclose = (event) => {
            this.onClose(event);
            if (event.code !== 1000) {
                this.retry();
            }
        };

        this.isConnecting = this.isReconnecting = false;
    }

    retry() {
        if (!this.isReconnecting) {
            this.isReconnecting = true;
            setTimeout(() => this.connect(), this.retryTimeout);
        }
    }

    sendMessage(message) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
            if (!this.isConnecting && !this.isReconnecting) {
                this.connect();
            }
        }
    }

    sendQueuedMessages() {
        while (this.messageQueue.length) {
            this.sendMessage(this.messageQueue.shift());
        }
    }

    onOpen() {}
    onMessage(data) {}
    onError(error) {}
    onClose(event) {}
}

module.exports = WebSocketClient;
