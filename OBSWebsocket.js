const { createHash, randomUUID } = nativeRequire('crypto');

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
                // eventSubscriptions: (1 << 0 | 1 << 1 | 1 << 2 | 1 << 3 | 1 << 4 | 1 << 5 | 1 << 6 | 1 << 7 | 1 << 8 | 1 << 9 | 1 << 10 | 1 << 16)
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

        const { address, args, host, port } = this.parseToOsc(data);

        receive(host, port, address, ...args);

        // if (this.callbackAddress && this.callbackAddress.length > 0) {
        //     receive('localhost', 8080, '/SET', this.callbackAddress, JSON.stringify(data));
        // }
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

    send(message, id = null) {
        if (!this.socket) {
            this.connect()
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
        // let address = '/obs/';
        const paths = ['/obs'];
        let args = [];
        let host = 'localhost';
        let port = 8080;

        const type = response.d.eventType || response.d.requestType;
        const data = response.d.eventData || response.d.responseData;

        if (!type) {
            return {
                address: this.callbackAddress,
                args: [JSON.stringify(response)],
                host: 'localhost',
                port: 8080
            }
        }

        const collections = ['Scene', 'Input', 'Output', 'Source', 'Transition', 'Profile', 'Record', 'Stream']
        const parts = type.match(/[A-Z][a-z]+/g)

        let collection
        for (const c of collections) {
            if (parts.includes(c)) {
                collection = parts.includes('List') ? 'List' : c;
                paths.push(c.toLowerCase() + (parts.includes('List') ? 's' : ''));
                break;
            }
        }

        switch (collection) {
            case 'List':
                const colType = paths[paths.length - 1];
                data[colType].forEach(item => args.push(item[`${colType.slice(0, -1)}Name`]));
                // data[colType].forEach(item => args.push(item));
                break;
            case 'Scene':
                ['Preview', 'Program'].forEach(p => {
                    if (parts.indexOf(p) != -1) {
                        paths.push(p.toLowerCase())
                        if (data) {
                            args.push(data.sceneName);
                        }
                        // args.push({ name: data.sceneName, uuid: data.sceneUuid });
                    }
                });
                break;
            case 'Input':
                if (data && data.inputName) {
                    paths.push(encodeURIComponent(data.inputName), parts[parts.length - 2].toLowerCase());
                    args.push('inputVolumeDb', data.inputVolumeDb)
                    console.log('getting volume', data.inputVolumeDb);
                }
                if (type === 'InputVolumeMeters') {
                    // https://github.com/obsproject/obs-websocket/commit/d48ddef0318af1e370a4d0b77751afc14ac6b140
                    data.inputs.forEach(input => {
                        const meters = {};
                        ['left', 'right'].forEach((channel, i) => {
                            const [mag, peak, inputPeak] = input.inputLevelsMul[i].map(level => 20.0 * Math.log10(level));
                            meters[channel] = { mag, peak, inputPeak}
                        })
                        // receive('localhost', 8080, this.callbackAddress, { [input.inputName]: meters });
                    })
                    return {
                        address: this.callbackAddress,
                        args: [JSON.stringify(response)],
                        host: 'localhost',
                        port: 8080
                    }
                }
                break;
            default:
                return {
                    address: this.callbackAddress,
                    args: [JSON.stringify(response)],
                    host: 'localhost',
                    port: 8080
                }
        }

        // switch (type) {
        //     case 'GetSceneList':
        //     case 'SceneListChanged':
        //         data.scenes.forEach(scene => args.push(scene.sceneName));
        //         address = '/obs/scenes';
        //         ['Program', 'Preview'].forEach(p => {
        //             const d = { d: { requestType: `GetCurrent${p}Scene` , responseData: { sceneName: data[`current${p}SceneName`]} } }
        //             this.onMessage({ data: JSON.stringify(d) })
        //         })
        //         break;
        //     case 'GetCurrentProgramScene':
        //     case 'SetCurrentProgramScene':
        //     case 'GetCurrentPreviewScene':
        //     case 'SetCurrentPreviewScene':
        //         address = `/obs/scene/${type.match(/Program|Preview/)[0].toLowerCase()}`
        //         args.push(data.sceneName);
        //         break;
        // }

        // const parts = requestType.match(/[A-Z][a-z]+/g)

        // const path = []
        // const args = [];

        // const mode = parts[0]
        // let collection = parts[1]
        // path.push(collection.toLowerCase());

        // switch (collection) {
        //     case 'Scene':
        //         if (parts[parts.length - 1] === 'List') {
        //             path[path.length - 1] += 's';
        //             data.scenes.forEach(scene => args.push(scene.sceneName))
        //             receive('localhost', 8080, '/obs/scene', data.currentProgramSceneName)
        //             receive('localhost', 8080, '/obs/scene/program', data.currentProgramSceneName)
        //             receive('localhost', 8080, '/obs/scene/preview', data.currentPreviewSceneName)
        //         }
        //         break;
        // }

        
        const address = paths.join('/');
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

        if (isList(parts[parts.length - 1])) {
            parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1);
            suffix = 'List';

            if (parts.length === 1) {
                rootKey = parts[0];
            }
        }
        
        rootKey = capitalize(rootKey);

        switch (rootKey) {
            case 'Scene':
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
            case 'Input':
                // AUDIOTRACKS MAY NOT WORK????
                const endpoints = ['create', 'remove', 'list', 'name', 'settings', 'mute', 'volume', 'audiobalance', 'audiosyncoffset', 'audiomonitortype', 'audiotracks']
                const endpoint = endpoints.includes(parts[parts.length - 1]) ? capitalize(parts[parts.length - 1]) : '';
                if (endpoint.length > 0) {
                    const id = idType(rootKey, decodeURIComponent(parts[1]));
                    request.d.requestData = {
                        [id]: decodeURIComponent(parts[1]),
                        [args[0].value]: args[1].value
                    }
                }
                request.d.requestType = `${prefix}${rootKey}${endpoint}${suffix}`;
                break;
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