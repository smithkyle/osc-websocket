const { createHash, randomUUID } = nativeRequire('crypto');
const path = nativeRequire('path');

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
            receive('localhost', 8080, '/SET', this.callbackAddress, JSON.stringify(data));
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

    parseToOsc(response) {
        const { requestType } = response.d
        const modeMatch = requestType.match(/^(Get|Set|Create|Remove|Trigger)/g)
        const mode =  Array.isArray(modeMatch) && modeMatch.length === 1 ? modeMatch : requestType;

        const itemMatch = requestType.match(/(Scene|Stream|Output)/)

        return { address, args, host, port };
    }

    parseToJson(osc) {
        const { address, args, host, port } = osc;
        const parts = address.replace('/obs/','').split('/');
        let rootKey = parts[0];
        let prefix = args[0]?.value ? 'Set' : 'Get';
        let suffix = '';

        const actions = ['Create', 'Remove', 'Duplicate', 'Trigger'];
        const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(str);
        const uuidOrName = (str) => isUuid(str) ? 'uuid' : 'name';
        const isList = (str) => /s$/.test(str);
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
        const idType = (type, value) => `${type.toLowerCase()}${capitalize(uuidOrName(value))}`;

        const request = { op: 6, d: {} }

        // if (isList(parts[parts.length - 1])) {
        //     rootKey = parts[parts.length - 1].slice(0, -1);
        //     suffix = 'List';
        // }

        switch (rootKey) {
            case 'scene':
            case 'scenes':
                if (isList(parts[parts.length - 1])) {
                    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1);
                    rootKey = parts[0];
                    suffix = 'List';
                }

                rootKey = capitalize(rootKey);

                if (parts.length === 1 && suffix !== 'List') {
                    parts[1] = 'program';
                }

                if (parts[1] === 'preview' || parts[1] === 'program') {
                    request.d.requestType = `${prefix}Current${capitalize(parts[1])}${rootKey}`;
                    if (prefix === 'Set') {
                        const id = idType(rootKey, args[0].value);
                        request.d.requestData = {
                            [id]: args[0].value
                        }
                    }
                }
                else if (parts[1]) {
                    if (actions.includes(capitalize(parts[1]))) {
                        request.d.requestType = `${capitalize(parts[1])}${rootKey}`;
                        if (args[0]) {
                            const id = idType(rootKey, args[0].value);
                            request.d.requestData = {
                                [id]: args[0].value
                            }
                        }
                    }
                    else {
                        const id = idType(rootKey, parts[1]);
                        request.d.requestData = {
                            [id]: parts[1]
                        }
                        parts[2] = !parts[2] ? 'name' : parts[2];
                        if (parts[2] === 'name' && prefix === 'Set') {
                            request.d.requestData[`new${rootKey}Name`] = args[0].value;
                        }
                        request.d.requestType = `${prefix}${rootKey}${capitalize(parts[2])}${suffix}`
                    }
                }
                else {
                    request.d.requestType = `${prefix}${rootKey}${suffix}`;
                }
                break;
        }

        if (!request.d.requestId) {
            request.d.requestId = randomUUID();
        }
        return request;

        const schemaHandlers = {
            scene: (parts) => {
                const sceneRequest = {};
                if (suffix === 'List') {

                }
                if (!parts[2] || parts[2].toLowerCase() === 'preview') {
                    const sceneType = !parts[2] === 'Preview' ? 'Preview' : 'Program';
                    sceneRequest.requestType = `${mode}Current${sceneType}Scene`
                    if (mode === 'Set') {
                        const id = idType('scene', args[0].value);
                        sceneRequest.requestData[id] = args[0].value;
                    }
                    return sceneRequest;
                }
                else if (parts[2] === 'create' || parts[2] === 'remove') {
                    sceneRequest.requestType = `${capitalize(parts[2])}Scene`
                    const identifier = `scene${capitalize(uuidOrName(args[0].value))}`;
                    sceneRequest.requestData[identifier] = args[0].value;
                    return sceneRequest;
                }
                else if (!parts[3]) {
                    sceneRequest.requestType = `${mode}SceneName`;
                    const identifier = `scene${capitalize(uuidOrName(parts[2]))}`;
                    sceneRequest.requestData[identifier] = parts[2];
                    return sceneRequest;
                }
            }
        }

        return {
            op: 6,
            d: schemaHandlers[rootKey](parts)
        }
    }

    close() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.close(1000, 'Unload');
        }
    }
}

module.exports = OBSWebsocket