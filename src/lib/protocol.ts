/********************************************************************
 created:    2022-01-09
 author:     lixianmin

 Copyright (C) - All Rights Reserved
 *********************************************************************/

const PKG_HEAD_BYTES = 4;
const MSG_FLAG_BYTES = 1;
const MSG_ROUTE_CODE_BYTES = 2;
const MSG_ID_MAX_BYTES = 5;
const MSG_ROUTE_LEN_BYTES = 1;

const MSG_ROUTE_CODE_MAX = 0xffff;
const MSG_COMPRESS_ROUTE_MASK = 0x1;
const MSG_TYPE_MASK = 0x7;


function copyArray(dest: Uint8Array, destOffset: number, src: Uint8Array, srcOffset: number, length: number) {
    for (let index = 0; index < length; index++) {
        dest[destOffset++] = src[srcOffset++];
    }
}

/**
 * pomele client encode
 * id message id;
 * route message route
 * msg message body
 * socketio current support string
 */
function strencode(str: string): Uint8Array {
    const buf = new ArrayBuffer(str.length * 3);
    const byteArray = new Uint8Array(buf);

    let offset = 0;
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);

        let codes: number[];
        if (charCode <= 0x7f) {
            codes = [charCode];
        } else if (charCode <= 0x7ff) {
            codes = [0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f)];
        } else {
            codes = [0xe0 | (charCode >> 12), 0x80 | ((charCode & 0xfc0) >> 6), 0x80 | (charCode & 0x3f)];
        }

        for (let j = 0; j < codes.length; j++) {
            byteArray[offset] = codes[j];
            ++offset;
        }
    }

    const result = new Uint8Array(offset);
    copyArray(result, 0, byteArray, 0, offset);
    return result;
}

/**
 * client decode
 * msg String data
 * return Message Object
 */
function strdecode(buffer): string {
    const bytes = new Uint8Array(buffer);
    const array: Array<number> = [];
    let offset = 0;
    let charCode = 0;
    const end = bytes.length;

    while (offset < end) {
        if (bytes[offset] < 128) {
            charCode = bytes[offset];
            offset += 1;
        } else if (bytes[offset] < 224) {
            charCode = ((bytes[offset] & 0x3f) << 6) + (bytes[offset + 1] & 0x3f);
            offset += 2;
        } else {
            charCode = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f);
            offset += 3;
        }
        array.push(charCode);
    }

    return arrayToString(array);
}

// 解决 String.fromCharCode.apply(null, ascii)) 报 Uncaught RangeError: Maximum call stack size exceeded 的问题
// https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string/12713326#12713326
function arrayToString(u8a: Array<number>): string {
    const CHUNK_SZ = 0x8000;
    const c: Array<string> = [];
    for (let i = 0; i < u8a.length; i += CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.slice(i, i + CHUNK_SZ)));
    }

    return c.join("");
}

class Package {
    static TYPE_HANDSHAKE = 1
    static TYPE_HANDSHAKE_ACK = 2
    static TYPE_HEARTBEAT = 3
    static TYPE_DATA = 4
    static TYPE_KICK = 5

    /**
     * Package protocol encode.
     *
     * Pomelo package format:
     * +------+-------------+------------------+
     * | type | body length |       body       |
     * +------+-------------+------------------+
     *
     * Head: 4bytes
     *   0: package type,
     *      1 - handshake,
     *      2 - handshake ack,
     *      3 - heartbeat,
     *      4 - data
     *      5 - kick
     *   1 - 3: big-endian body length
     * Body: body length bytes
     *
     * @param  {Number}    type   package type
     * @param  {Uint8Array} body  body content in bytes
     * @return {Uint8Array}       new byte array that contains encode result
     */
    encode(type: number, body: Uint8Array): Uint8Array {
        const length = body ? body.length : 0;
        const buffer = new Uint8Array(PKG_HEAD_BYTES + length);

        let index = 0;
        buffer[index++] = type & 0xff;
        buffer[index++] = (length >> 16) & 0xff;
        buffer[index++] = (length >> 8) & 0xff;
        buffer[index++] = length & 0xff;

        if (body) {
            copyArray(buffer, index, body, 0, length);
        }
        return buffer;
    }

    /**
     * Package protocol decode.
     * See encode for package format.
     *
     * @param  {Uint8Array} buffer byte array containing package content
     * @return {Object}           {type: package type, buffer: body byte array}
     */
    decode(buffer): object {
        let offset = 0;
        const bytes = new Uint8Array(buffer);
        const rs: Array<object> = [];

        while (offset < bytes.length) {
            const type = bytes[offset++];
            const length = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0;
            const body = length ? new Uint8Array(length) : new Uint8Array();
            copyArray(body, 0, bytes, offset, length);
            offset += length;

            rs.push({'type': type, 'body': body});
        }

        return rs.length === 1 ? rs[0] : rs;
    }
}

class Message {
    static TYPE_REQUEST = 0
    static TYPE_NOTIFY = 1
    static TYPE_RESPONSE = 2
    static TYPE_PUSH = 3

    private calculateMsgIdBytes(id) {
        let len = 0;
        do {
            len += 1;
            id >>= 7;
        } while (id > 0);

        return len;
    }

    private encodeMsgFlag(type, compressRoute, buffer, offset) {
        if (type !== Message.TYPE_REQUEST && type !== Message.TYPE_NOTIFY &&
            type !== Message.TYPE_RESPONSE && type !== Message.TYPE_PUSH) {
            throw new Error('unknown message type: ' + type);
        }

        buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);
        return offset + MSG_FLAG_BYTES;
    }

    private encodeMsgId(id, buffer, offset) {
        do {
            let tmp = id % 128;
            const next = Math.floor(id / 128);

            if (next !== 0) {
                tmp = tmp + 128;
            }
            buffer[offset++] = tmp;

            id = next;
        } while (id !== 0);

        return offset;
    }

    private encodeMsgRoute(compressRoute, route, buffer, offset) {
        if (compressRoute) {
            if (route > MSG_ROUTE_CODE_MAX) {
                throw new Error('route number is overflow');
            }

            buffer[offset++] = (route >> 8) & 0xff;
            buffer[offset++] = route & 0xff;
        } else {
            if (route) {
                buffer[offset++] = route.length & 0xff;
                copyArray(buffer, offset, route, 0, route.length);
                offset += route.length;
            } else {
                buffer[offset++] = 0;
            }
        }

        return offset;
    }

    private encodeMsgBody(msg, buffer, offset) {
        copyArray(buffer, offset, msg, 0, msg.length);
        return offset + msg.length;
    }

    private static msgHasId(type: number): boolean {
        return type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE;
    }

    private static msgHasRoute(type: number): boolean {
        return type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY ||
            type === Message.TYPE_PUSH;
    }

    /**
     * Message protocol encode.
     *
     * @param  {Number} id            message id
     * @param  {Number} type          message type
     * @param  {Number} compressRoute whether compress route
     * @param  {Number|String} route  route code or route string
     * @param  {Buffer} msg           message body bytes
     * @return {Buffer}               encode result
     */
    encode(id, type, compressRoute, route, msg) {
        // calculate message max length
        const idBytes = Message.msgHasId(type) ? this.calculateMsgIdBytes(id) : 0;
        let msgLen = MSG_FLAG_BYTES + idBytes;

        if (Message.msgHasRoute(type)) {
            if (compressRoute) {
                if (typeof route !== 'number') {
                    throw new Error('error flag for number route!');
                }
                msgLen += MSG_ROUTE_CODE_BYTES;
            } else {
                msgLen += MSG_ROUTE_LEN_BYTES;
                if (route) {
                    route = strencode(route);
                    if (route.length > 255) {
                        throw new Error('route maxlength is overflow');
                    }
                    msgLen += route.length;
                }
            }
        }

        if (msg) {
            msgLen += msg.length;
        }

        const buffer = new Uint8Array(msgLen);
        let offset = 0;

        // add flag
        offset = this.encodeMsgFlag(type, compressRoute, buffer, offset);

        // add message id
        if (Message.msgHasId(type)) {
            offset = this.encodeMsgId(id, buffer, offset);
        }

        // add route
        if (Message.msgHasRoute(type)) {
            offset = this.encodeMsgRoute(compressRoute, route, buffer, offset);
        }

        // add body
        if (msg) {
            offset = this.encodeMsgBody(msg, buffer, offset);
        }

        return buffer;
    }

    /**
     * Message protocol decode.
     *
     * @param  {Buffer|Uint8Array} buffer message bytes
     * @return {Object}            message object
     */
    decode(buffer): object {
        const bytes = new Uint8Array(buffer);
        const bytesLen = bytes.length || bytes.byteLength;
        let offset = 0;
        let id = 0;
        let route: string = '';

        // parse flag
        const flag = bytes[offset++];
        const compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
        const type = (flag >> 1) & MSG_TYPE_MASK;

        // parse id
        if (Message.msgHasId(type)) {
            let m = (bytes[offset]);
            let i = 0;
            do {
                m = (bytes[offset]);
                id = id + ((m & 0x7f) * Math.pow(2, (7 * i)));
                offset++;
                i++;
            } while (m >= 128);
        }

        // parse route
        if (Message.msgHasRoute(type)) {
            if (compressRoute) {
                route = ((bytes[offset++]) << 8 | bytes[offset++]).toString();
            } else {
                const routeLen = bytes[offset++];
                if (routeLen) {
                    let buf = new Uint8Array(routeLen);
                    copyArray(buf, 0, bytes, offset, routeLen);
                    route = strdecode(route);
                } else {
                    route = '';
                }
                offset += routeLen;
            }
        }

        // parse body
        const bodyLen = bytesLen - offset;
        const body = new Uint8Array(bodyLen);

        copyArray(body, 0, bytes, offset, bodyLen);

        return {
            'id': id, 'type': type, 'compressRoute': compressRoute,
            'route': route, 'body': body
        };
    }
}



