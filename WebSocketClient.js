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

        this.isHandlingError = false;

        this.on("error", (e) => {
            // if (e.type === "connect") {
            //     this.shouldReconnect = true;
            // }
        })
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                
                this.shouldReconnect = true;
                this.socket = new WebSocket(this.url);

                this.socket.onopen = () => this.onOpen(resolve);
                this.socket.onerror = (error) => this.onError(error, reject);
                this.socket.onmessage = (event) => this.onMessage(event);
                this.socket.onclose = (event) => this.onClose(event);
            } catch (error) {
                console.error("Error creating WebSocket instance:", error.type, error.message);
                reject(error);
            }
        });
    }
    

    async reconnect() {
        if (this.isReconnecting) return;
    
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnect attempts reached");
            this.cleanupSocket(); // Cleanup after exhausting reconnect attempts
            this.emit("reconnect_failed");
            return;
        }
    
        this.isReconnecting = true;
        this.reconnectAttempts++;
        console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
        try {
            // Wait before attempting to reconnect
            await new Promise((resolve) => setTimeout(resolve, this.reconnectInterval));
    
            // Try reconnecting
            await this.connect();
            console.log("Reconnected successfully");
    
            // Reset state on success
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.emit("reconnect_success");
        } catch (error) {
            console.error("Reconnect attempt failed:", error.type, error.message);
    
            // Reset `isReconnecting` to allow subsequent attempts
            this.isReconnecting = false;
    
            // Retry if allowed
            if (this.shouldReconnect) {
                this.reconnect();
            } else {
                this.cleanupSocket();
            }
        }
    }

    cleanupSocket() {
        console.log("Cleaning up WebSocket client");
    
        // Close the existing socket, if any
        if (this.socket) {
            this.socket.removeAllListeners(); // Remove any lingering event listeners
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                this.socket.close();
            }
            this.socket = null; // Dereference the socket
        }
    
        // Reset state variables
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.shouldReconnect = false;
        this.processingQueue = false;
        this.messageProcessingLock = false;
    
        // Emit a cleanup or failure event, if necessary
        this.emit("cleanup");
    }
    

    onOpen(resolve) {
        console.log("WebSocket connection opened");
        this.reconnectAttempts = 0;
        this.emit("open");
        resolve();
        this._processQueue();
    }

    onError(error, reject) {
        console.error("WebSocket connection error:", error.type, error.message);
        this.emit("error", error, reject);
        
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
        else {
            this.cleanupSocket();
        }
    }

    async _processQueue() {
        console.log(this.processingQueue, !this.messageQueue.length, this.messageProcessingLock)
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
                    await new Promise((res) => this.once("message", res));
                    resolve()
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
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.removeAllListeners();
            this.socket.close();
            console.log("WebSocket closed")
        }
    }
}

module.exports = WebSocketClient;