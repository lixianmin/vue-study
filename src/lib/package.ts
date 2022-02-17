/********************************************************************
 created:    2022-01-09
 author:     lixianmin

 Copyright (C) - All Rights Reserved
 *********************************************************************/
import {copyArray} from "./protocol";

export class Package {
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
    public static encode(type: number, body: Uint8Array = new Uint8Array): Uint8Array {
        const length = body ? body.length : 0;
        const packageHeadLength = 4
        const buffer = new Uint8Array(packageHeadLength + length)

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
     * @param  {ArrayBuffer} buffer byte array containing package content
     * @return {Package}           {type: package type, buffer: body byte array}
     */
    public static decode(buffer: ArrayBuffer): Package[] {
        let offset = 0
        const bytes = new Uint8Array(buffer)
        console.log("buffer.byteLength", buffer.byteLength, bytes.length)
        const list: Package[] = []

        while (offset < bytes.length) {
            const type: number = bytes[offset++]
            const length: number = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0
            if (length >= 0) {
                const body = new Uint8Array(length)
                if (length > 0) {
                    copyArray(body, 0, bytes, offset, length)
                    offset += length
                }

                let pack = new Package(type, body)
                list.push(pack)
            }
        }

        return list
    }

    private constructor(type: number, body: Uint8Array) {
        this.type = type
        this.body = body
    }

    public type: number
    public body: Uint8Array
}
