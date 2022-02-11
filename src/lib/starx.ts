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

    public emit(key: string, args: any) {
        const handler = this.pushHandlers[key] as PushHandlerFunc
        if (handler != null) {
            handler(key)
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
        if (msg.id) {
            // if there is an id, then find the callback function with the request
            const cb = this.callbacks[msg.id]
            this.callbacks.delete(msg.id)

            if (typeof cb !== 'function') {
                return
            }

            cb(msg.body)
        } else { // server push message
            const handler = this.pushHandlers[msg.route] as PushHandlerFunc
            if (typeof handler !== "undefined") {
                handler(msg.body)
            }
        }
    }

    private pushHandlers = new Map<string, PushHandlerFunc>()
    private handlers = new Map<number, HandlerFunc>()
    private routeMap = new Map<number, any>()
    private callbacks = new Map<number, any>()

    private abbrs = {}
    private dict

    private heartbeatInterval = 0
    private heartbeatTimeout = 0
    private handshakeCallback

    private reconnect = false
    private reconncetTimer = 0
    private reconnectAttempts = 0
    private reconnectionDelay = 5000
}