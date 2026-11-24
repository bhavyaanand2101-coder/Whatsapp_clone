# Socket.IO Real-Time & WebRTC Protocol Specification

## 1. Overview
The real-time layer is powered by Socket.IO v4 with bi-directional fallback to native WebSockets (`/socket.io/?EIO=4&transport=websocket`).

---

## 2. Real-Time Events Specification

### Starter Compatibility Events (Preserved)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `gyankibaat` | Server → Client | `"welcome to socket.io server"` | Welcome handshake message emitted upon client connection. |
| `announcement` | Server → Client | `"Today is last time we study web dev -3"` | Broadcast announcement emitted on initial connection. |
| `kuchbhi` | Client → Server | `String` or `Object` | Echo/test event. Logs and broadcasts incoming payload. |
| `join` | Client → Server | `String` (room name) | Legacy room join event. Joins Socket to target room. |

### Core WhatsApp Protocol Events

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `user:join` | Client → Server | `{ id, username, avatar }` | Registers user identity and broadcasts presence. |
| `user:online` | Server → Client | `{ userId, username }` | Broadcast to all users when a user comes online. |
| `user:offline` | Server → Client | `{ userId, username, lastSeen }` | Broadcast to all users when a user disconnects. |
| `room:join` | Client → Server | `{ roomId }` | Joins chat room and emits recent message history. |
| `message:send` | Client → Server | `{ roomId, text, mediaType, mediaUrl, replyTo }` | Sends message to room members and persists in MongoDB. |
| `message:receive` | Server → Client | `MessageObject` | Delivered to room subscribers. |
| `message:new` | Server → Client | `MessageObject` | Real-time event alias for new message dispatch. |
| `message:delivered` | Server → Client | `{ messageId, roomId }` | Acknowledgment of message storage & delivery. |
| `message:read` | Client → Server | `{ messageId, roomId }` | Emits double blue tick read receipt update. |
| `message:status_updated` | Server → Client | `{ messageId, status: "read" }` | Read receipt broadcast to sender. |
| `message:edit` | Client → Server | `{ messageId, roomId, text }` | Edits own message content in MongoDB. |
| `message:edited` | Server → Client | `{ messageId, text, isEdited: true, roomId }` | Broadcast updated message text. |
| `message:delete` | Client → Server | `{ messageId, roomId, deleteForEveryone }` | Deletes message for self or everyone. |
| `message:deleted` | Server → Client | `{ messageId, isDeletedForEveryone: true }` | Updates message to "This message was deleted". |
| `message:deleted_for_me` | Server → Client | `{ messageId }` | Removes message from local view. |
| `message:react` | Client → Server | `{ messageId, roomId, emoji }` | Toggles emoji reaction on message. |
| `message:reacted` | Server → Client | `{ messageId, reactions }` | Broadcasts updated reactions array. |
| `typing:start` | Client → Server | `{ roomId }` | Emits typing notification to room members. |
| `typing:stop` | Client → Server | `{ roomId }` | Clears typing notification. |
| `group:update` | Client → Server | `{ roomId, name, description, avatar }` | Modifies group metadata. |
| `group:updated` | Server → Client | `{ roomId, ... }` | Broadcasts group updates to all group members. |

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

### `call:ice_candidate`
- **Sent by**: Either peer
- **Payload**:
```json
{
  "roomId": "general",
  "candidate": { "candidate": "...", "sdpMid": "0", "sdpMLineIndex": 0 }
}
```
- **Server action**: Emits `call:ice_candidate` to counterpart.

### `call:reject`
- **Sent by**: Receiving peer
- **Payload**: `{ "roomId": "general" }`
- **Server action**: Emits `call:rejected` to caller.

### `call:end`
- **Sent by**: Either peer
- **Payload**: `{ "roomId": "general" }`
- **Server action**: Emits `call:ended` to all participants and resets call state.
