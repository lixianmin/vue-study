/********************************************************************
 created:    2022-01-10
 author:     lixianmin

 Copyright (C) - All Rights Reserved
 *********************************************************************/

type PushHandlerFunc = (data: Uint8Array) => void
type HandlerFunc = (data: string) => void

class StartX {
    public on(key: string, handler: PushHandlerFunc) {
        this.pushHandlers[key] = handler;
    }

    public emit(key: string, args: Uint8Array = new Uint8Array) {
        const handler = this.pushHandlers[key] as PushHandlerFunc
        if (handler != null) {
            handler(args)
        }
    }

    private processPackage(msgs: any) {
        if (Array.isArray(msgs)) {
            for (let i = 0; i < msgs.length; i++) {
                const msg = msgs[i];
                this.handleMessage(msg.type, msg.body)
            }
        } else {
            this.handleMessage(msgs.type, msgs.body)
        }
    }

    private handleMessage(type, body) {
        const handler = this.handlers[type];
        if (handler != null) {
            handler(body)
        }
    }

    private defaultDecode(data) {
        const msg = Message.decode(data)

        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id]
            this.routeMap.delete(msg.id)

            if (!msg.route) {
                return;
            }
        }

        msg.body = this.decompose(msg);
        return msg;
    }

    private decompose(msg: Message) {
        let route = msg.route;

        //Decompose route from dict
        if (msg.compressRoute) {
            if (!this.abbrs[route]) {
                return {}
            }

            route = msg.route = this.abbrs[route]
        }

        return JSON.parse(strdecode(msg.body))
    }

    private reset() {
        this.reconnect = false;
        this.reconnectionDelay = 1000 * 5;
        this.reconnectAttempts = 0;
        clearTimeout(this.reconncetTimer);
    }

    private initData(data) {
        if (!data || !data.sys) {
            return
        }

        this.dict = data.sys.dict

        // init compress dict
        if (this.dict) {
            this.abbrs = {}

            for (const route in this.dict) {
                this.abbrs[this.dict[route]] = route
            }
        }
    }

    private handshakeInit(data) {
        if (data.sys && data.sys.heartbeat) {
            this.heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
            this.heartbeatTimeout = this.heartbeatInterval * 2;        // max heartbeat timeout
        } else {
            this.heartbeatInterval = 0
            this.heartbeatTimeout = 0
        }

        this.initData(data)

        if (typeof this.handshakeCallback === 'function') {
            this.handshakeCallback(data.user)
        }
    }

    private processMessage(msg: Message) {
        // todo 这些需要测试才行
        if (msg.id) {
            // if there is an id, then find the callback function with the request
            const callback = this.callbacks[msg.id]
            this.callbacks.delete(msg.id)

            if (typeof callback === 'function') {
                callback(msg.body)
            }
        } else { // server push message
            const handler = this.pushHandlers[msg.route] as PushHandlerFunc
            if (typeof handler !== "undefined") {
                handler(msg.body)
            }
        }
    }

    private heartbeatTimeoutCb() {
        const gap = this.nextHeartbeatTimeout - Date.now();
        const gapThreshold = 100;   // heartbeat gap threshold
        if (gap > gapThreshold) {
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb, gap);
        } else {
            console.error('server heartbeat timeout');
            this.emit('heartbeat timeout');
            this.disconnect();
        }
    }

    private send(packet: any) {
        if (this.socket != null) {
            this.socket.send(packet.buffer)
        }
    }

    private sendMessage(reqId, route, msg: Uint8Array) {
        // if (this.useCrypto) {
        //     msg = JSON.stringify(msg);
        //     var sig = window.rsa.signString(msg, "sha256");
        //     msg = JSON.parse(msg);
        //     msg['__crypto__'] = sig;
        // }

        if (this.encode) {
            msg = this.encode(reqId, route, msg);
        }

        const packet = Package.encode(Package.TYPE_DATA, msg);
        this.send(packet);
    }

    public connect(params, url: string, cb) {
        console.log('connect to: ' + url)
        params = params || {}

        const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10
        const maxReconnectAttempts = params.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
        this.reconnectUrl = url;

        let that = this
        const onopen = function (event) {
            if (that.reconnect) {
                that.emit('reconnect');
            }

            that.reset()
            const obj = Package.encode(Package.TYPE_HANDSHAKE, strencode(JSON.stringify(that.handshakeBuffer)));
            that.send(obj)
        }

        const onmessage = function (event) {
            // todo 问题是, 原始的js中方法定义processPackage就只有一个参数啊
            // that.processPackage(Package.decode(event.data), cb);
            that.processPackage(Package.decode(event.data));

            // new package arrived, update the heartbeat timeout
            if (that.heartbeatTimeout) {
                that.nextHeartbeatTimeout = Date.now() + that.heartbeatTimeout;
            }
        }

        const onerror = function (event) {
            that.emit('io-error', event)
            console.error('socket error: ', event)
        };

        const onclose = function (event) {
            that.emit('close', event)
            that.emit('disconnect', event)
            console.log('socket close: ', event)
            if (!!params.reconnect && that.reconnectAttempts < maxReconnectAttempts) {
                that.reconnect = true
                that.reconnectAttempts++

                that.reconncetTimer = setTimeout(function () {
                    that.connect(params, that.reconnectUrl, cb)
                }, that.reconnectionDelay)
                that.reconnectionDelay *= 2
            }
        };

        let socket = new WebSocket(url)
        socket.binaryType = 'arraybuffer'
        socket.onopen = onopen
        socket.onmessage = onmessage
        socket.onerror = onerror
        socket.onclose = onclose

        this.socket = socket
    }

    private init(params, cb) {
        this.initCallback = cb;
        this.handshakeCallback = params.handshakeCallback;

        this.encode = params.encode || this.defaultEncode;
        this.decode = params.decode || this.defaultDecode;

        this.handshakeBuffer.user = params.user;
        // if (params.encrypt) {
        //     this.useCrypto = true;
        //     rsa.generate(1024, "10001");
        //     this.handshakeBuffer.sys.rsa = {
        //         rsa_n: rsa.n.toString(16),
        //         rsa_e: rsa.e
        //     };
        // }

        this.connect(params, params.url, cb);
    }

    private defaultEncode(reqId, route, msg) {
        const type = reqId ? MessageType.Request : MessageType.Notify

        msg = strencode(JSON.stringify(msg))

        let compressRoute = false
        if (this.dict && this.dict[route]) {
            route = this.dict[route]
            compressRoute = true
        }

        return Message.encode(reqId, type, compressRoute, route, msg)
    }

    public disconnect() {
        if (this.socket != null) {
            this.socket.close()
            console.log('disconnect');
            this.socket = null;
        }

        if (this.heartbeatId) {
            clearTimeout(this.heartbeatId);
            this.heartbeatId = null;
        }

        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }
    }

    public request(route, msg, cb) {
        if (arguments.length === 2 && typeof msg === 'function') {
            cb = msg
            msg = {}
        } else {
            msg = msg || {}
        }

        route = route || msg.route
        if (!route) {
            return
        }

        let reqId = this.reqId++
        this.sendMessage(reqId, route, msg)

        this.callbacks[reqId] = cb
        this.routeMap[reqId] = route
    }

    public notify(route, msg) {
        msg = msg || {}
        this.sendMessage(0, route, msg)
    }

    private socket: WebSocket | null = null
    private useCrypto = false
    private encode
    private decode
    private initCallback
    private reqId = 0;


    private reconnectUrl = ""
    private reconnect = false
    private reconncetTimer: any
    private reconnectAttempts = 0
    private reconnectionDelay = 5000

    private handshakeBuffer = {
        'sys': {
            type: 'js-websocket',
            version: '0.0.1',
            rsa: {}
        },
        'user': {}
    };

    private pushHandlers = new Map<string, PushHandlerFunc>()
    private handlers = new Map<number, HandlerFunc>()
    private routeMap = new Map<number, any>()
    private callbacks = new Map<number, any>()

    private abbrs = {}
    private dict = {}

    private heartbeatInterval = 0
    private heartbeatTimeout = 0
    private nextHeartbeatTimeout = 0
    private heartbeatTimeoutId: any
    private heartbeatId: any
    private handshakeCallback
}