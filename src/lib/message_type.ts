/********************************************************************
 created:    2022-01-10
 author:     lixianmin

 Copyright (C) - All Rights Reserved
 *********************************************************************/

enum MessageType {
    Request = 0,
    Notify = 1,
    Response = 2,
    Push = 3,
    Count
}

namespace MessageType {
    export function hasId(type: MessageType): boolean {
        return type === MessageType.Request || type === MessageType.Response;
    }

    export function hasRoute(type: MessageType): boolean {
        return type === MessageType.Request || type === MessageType.Notify || type === MessageType.Push;
    }

    export function isValid(type: MessageType): boolean {
        return type >= MessageType.Request && type < MessageType.Count;
    }
}