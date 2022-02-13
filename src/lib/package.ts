/********************************************************************
 created:    2022-01-09
 author:     lixianmin

 Copyright (C) - All Rights Reserved
 *********************************************************************/

class Package {
    static TYPE_HANDSHAKE = 1
    static TYPE_HANDSHAKE_ACK = 2
    static TYPE_HEARTBEAT = 3
    static TYPE_DATA = 4
    static TYPE_KICK = 5

    static PKG_HEAD_BYTES = 4


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
    public static encode(type: number, body: Uint8Array): Uint8Array {
        const length = body ? body.length : 0;
        const buffer = new Uint8Array(Package.PKG_HEAD_BYTES + length);

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
    public static decode(buffer): object {
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
