const EventEmitter = nativeRequire('events')
const WebSocket = nativeRequire('ws');

class WebSocketClient extends EventEmitter {
    constructor(url, options = {}) {
        super();
        this.url = url;
        this.reconnectInterval = options.reconnectInterval || 2000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.responseTimeout = options.responseTimeout || 10000;

        this.socket = null;
        this.reconnectAttempts = 0;
        this.shouldReconnect = false;
        this.isReconnecting = false;
        
        this.messageQueue = [];
        this.processingQueue = false;
        this.messageProcessingLock = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.shouldReconnect = true;
            this.socket = new WebSocket(this.url)

            this.socket.onopen = () => this.onOpen(resolve);
            this.socket.onerror = (error) => this.onError(error, reject);
            this.socket.onmessage = (event) => this.onMessage(event);
            this.socket.onclose = (event) => this.onClose(event);
        });
    }

    async reconnect() {
        if (this.isReconnecting) return;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnect attempts reached");
            this.emit("reconnect_failed");
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        await new Promise((resolve) => setTimeout(resolve, this.reconnectInterval));

        try {
            await this.connect();
            console.log("Reconnected successfully");
            this.reconnectAttempts = 0;
            this.emit("reconnect_success");
        }
        catch(error) {
            console.error("Reconnect failed:", error);
            this.reconnect();
        }
        finally {
            this.isReconnecting = false;
        }
    }

    onOpen(resolve) {
        console.log("WebSocket connection opened");
        this.reconnectAttempts = 0;
        this.emit("open");
        resolve();
        this._processQueue();
    }

    onError(error, reject) {
        console.error("WebSocket connection error:", error);
        this.emit("error", error);
        if (reject) reject(error);

        if (this.shouldReconnect) {
            this.reconnect()
        }
    }

    onMessage(event) {
        const message = JSON.parse(event.data);
        console.log("Message received:", message);

        if (message.id) {
            this.emit(`response:${message.id}`, message);
        }
        else {
            this.emit("message", message);
        }
    }

    onClose(event) {
        console.warn("WebSocket connection closed:", event.code, event.reason);
        this.emit("close", event);

        if (this.shouldReconnect || event.code !== 1000) {
            this.reconnect();
        }
    }

    async _processQueue() {
        if (this.processingQueue || !this.messageQueue.length || this.messageProcessingLock) return;

        this.messageProcessingLock = true;
        this.processingQueue = true;

        while (this.messageQueue.length) {
            const { payload, id, resolve, reject } = this.messageQueue.shift();

            try {
                if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                    throw new Error("WebSocket is not open")
                }

                this.socket.send(JSON.stringify(payload));
                console.log("Message sent:", payload);

                if (id) {
                    const responseEvent = `response:${id}`;
                    const response = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            this.off(responseEvent, resolve);
                            reject(new Error(`Timeout waiting for response to message id: ${id}`));
                        }, this.responseTimeout);

                        this.once(responseEvent, (message) => {
                            clearTimeout(timeout);
                            resolve(message)
                        });
                    })
                    resolve(response)
                }
                else {
                   resolve();
                }
            }
            catch (error) {
                reject(error)
            }
        }
        this.processingQueue = false;
        this.messageProcessingLock = false;
    }

    send(message, id = null) {
        return new Promise((resolve, reject) => {
            const payload = id ? { id, ...message } : { ...message };
            this.messageQueue.push({ payload, id, resolve, reject });
            this._processQueue();
        });
    }

    close() {
        this.shouldReconnect = false;
        if (this.socket) {
            this.removeAllListeners();
            this.socket.close();
            console.log("WebSocket closed")
        }
    }
}

module.exports = WebSocketClient;