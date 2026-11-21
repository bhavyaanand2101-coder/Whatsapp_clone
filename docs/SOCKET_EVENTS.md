# Socket.IO Real-Time & WebRTC Protocol Specification

## 1. Overview
The real-time layer is powered by Socket.IO v4 with bi-directional fallback to native WebSockets (`/socket.io/?EIO=4&transport=websocket`).

---

## 2. Backward Compatibility Starter Events

To guarantee 100% compatibility with starter assignments and automated tests, the following events are preserved:

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `gyankibaat` | Server → Client | `"welcome to socket.io server"` | Welcome handshake message emitted upon client connection. |
| `announcement` | Server → Client | `"Today is last time we study web dev -3"` | Broadcast announcement emitted on initial connection. |
| `kuchbhi` | Client → Server | `String` or `Object` | Echo/test event. Logs and broadcasts incoming payload. |
| `join` | Client → Server | `String` (room name) | Legacy room join event. Joins Socket to target room. |
| `user:join` | Client → Server | `{ id, username, avatar }` | Registers user identity and broadcasts presence. |
| `room:join` | Client → Server | `roomId` | Joins chat room and emits recent message history. |
| `message:send` | Client → Server | `{ roomId, conversationId, text, mediaType, ... }` | Emits message to room members and stores in MongoDB. |
| `message:receive` | Server → Client | `MessageObject` | Delivered to all room subscribers. |
| `typing:start` | Client → Server | `{ roomId }` | Emits typing notification to room. |
| `typing:stop` | Client → Server | `{ roomId }` | Clears typing notification. |
| `message:read` | Client → Server | `{ messageId, roomId }` | Emits read receipt update to sender. |

---

## 3. WebRTC Audio & Video Calling Protocol

Signaling messages route peer connection offers, answers, and ICE candidates between clients:

### `call:initiate`
- **Sent by**: Calling peer
- **Payload**:
```json
{
  "roomId": "general",
  "isVideo": true,
  "offer": { "type": "offer", "sdp": "..." }
}
```
- **Server action**: Emits `call:incoming` to other participants in the target room.

### `call:answer`
- **Sent by**: Receiving peer
- **Payload**:
```json
{
  "roomId": "general",
  "answer": { "type": "answer", "sdp": "..." }
}
```
- **Server action**: Emits `call:answered` to initiator.

### `call:candidate`
- **Sent by**: Either peer
- **Payload**:
```json
{
  "roomId": "general",
  "candidate": { "candidate": "...", "sdpMid": "0", "sdpMLineIndex": 0 }
}
```
- **Server action**: Emits `call:candidate` to counterpart.

### `call:end`
- **Sent by**: Either peer
- **Payload**: `{ "roomId": "general" }`
- **Server action**: Emits `call:ended` to all participants and resets call state.
