# BUG FIXES LOG: WHATSAPP FULL-STACK PLATFORM

**Audit & Fix Period**: November 22, 2026  
**Status**: All Identified Bugs Fixed & Verified  

---

## 1. BUG REGISTRY

### BUG-01: Message History Render Failure on Frontend Room Switch
- **Severity**: **HIGH**
- **Affected File**: `client.html` (function `handleSwitchRoom`)
- **Root Cause**: `handleSwitchRoom` invoked `fetch('/api/messages/' + roomId)` and checked `if (Array.isArray(res.data))`. The backend endpoint `GET /api/messages/:roomId` returns a direct Array payload (`res.json(sanitized)`), causing `res.data` to be `undefined`. The condition evaluated to `false`, leaving chat empty until/unless socket history arrived.
- **Fix**: Updated condition to accept direct array or envelope:
  ```javascript
  const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
  if (activeRoomIdRef.current === roomId) setMessages(list);
  ```
- **Verification**: Tested switching between default channels and direct chats; messages populate instantaneously via both HTTP and Socket.IO.

---

### BUG-02: Socket Connection Storm on Room Switching
- **Severity**: **HIGH**
- **Affected File**: `client.html` (`useEffect` socket hook)
- **Root Cause**: `useEffect` had `activeRoomId` in its dependency array. Every time a user clicked another chat in the sidebar, React unmounted the effect, ran `s.disconnect()`, and established a brand new WebSocket connection with a new socket ID, causing unnecessary handshake overhead, presence thrashing, and event listener churn.
- **Fix**: Removed `activeRoomId` from socket hook dependencies. The socket now maintains a persistent connection for the authenticated session, and room switching emits `room:join` without socket reconnection.
- **Verification**: Verified WebSocket connection remains open during room navigation; active socket count remains stable.

---

### BUG-03: IDOR Authorization Bypass in Conversation Lookup
- **Severity**: **CRITICAL**
- **Affected File**: `src/controllers/conversation.controller.js` (`getConversationById`)
- **Root Cause**: The authorization condition was written as `if (!conv.slug && req.user)`. For unauthenticated requests (`req.user` is undefined), the expression evaluated to `false`, skipping the membership check and leaking full conversation details and participants to any caller.
- **Fix**: Required authentication for private conversations (`if (!req.user) return apiError(res, 401)`), and verified that `req.user._id` exists in `conv.participants` (returning 403 if unauthorized).
- **Verification**: Automated test Section 9 verifies 401 for unauthenticated requests and 403 for unauthorized users.

---

### BUG-04: IDOR in Message History and Message Sending
- **Severity**: **CRITICAL**
- **Affected File**: `src/controllers/message.controller.js` (`getMessages`, `sendMessage`)
- **Root Cause**: No participant validation was performed on `getMessages` or `sendMessage`. An unauthorized user could query or post messages to any private conversation ID.
- **Fix**: Added participant checks to both endpoints. If `conv` has no slug, caller must be authenticated and listed in `conv.participants`.
- **Verification**: Automated test Section 9, Cases 3, 4, 5 verify unauthorized reads and writes are blocked with 401/403.

---

### BUG-05: Unauthorized Socket.IO Room Joining & Information Leakage
- **Severity**: **CRITICAL**
- **Affected File**: `src/sockets/chat.socket.js` (`room:join`, `message:send`)
- **Root Cause**: Sockets could emit `room:join` with any `roomId`. The server joined the socket into the room and broadcast `room:history` containing private messages to unauthorized sockets.
- **Fix**: Added participant authorization in both `room:join` and `message:send`. Unauthorized sockets are not joined and receive an `error:unauthorized` event.
- **Verification**: Automated test Section 14 verifies WebSocket client is rejected with `error:unauthorized`.

---

### BUG-06: Catastrophic Backtracking ReDoS Vulnerability in Message Search
- **Severity**: **HIGH**
- **Affected File**: `src/controllers/message.controller.js` (`searchMessages`)
- **Root Cause**: Query parameter `q` was passed directly into `{ $regex: q.trim(), $options: "i" }` without escaping special regular expression tokens.
- **Fix**: Implemented `escapeRegex(string)` and bounded `q` length to 100 characters.
- **Verification**: Automated test Section 13 verified nested regex patterns execute safely without event loop lag.

---

### BUG-07: Blocked User Messaging Bypass
- **Severity**: **MEDIUM**
- **Affected File**: `src/controllers/conversation.controller.js`, `src/controllers/message.controller.js`
- **Root Cause**: User block lists were stored in MongoDB but never enforced during direct conversation creation or message sending.
- **Fix**: Added bilateral block checks to `createDirectChat` and `sendMessage`. If either party has blocked the other, action is rejected with `403 Forbidden`.
- **Verification**: Automated test Section 10 verifies chat creation and messaging are blocked.

---

### BUG-08: Stored XSS Exposure via Uploaded SVG Files
- **Severity**: **MEDIUM**
- **Affected File**: `server.js` (`/uploads` static middleware)
- **Root Cause**: Uploads allowed `image/svg+xml`, which could execute embedded scripts if served inline without CSP.
- **Fix**: Configured static middleware with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` and `nosniff`.
- **Verification**: Verified HTTP response headers on `/uploads/` file requests.

---

### BUG-09: Unutilized MessageReceipt and Notification Models
- **Severity**: **MEDIUM**
- **Affected File**: `src/controllers/message.controller.js`, `src/sockets/chat.socket.js`
- **Root Cause**: `MessageReceipt` and `Notification` models were created in the schema layer but never instantiated or updated during messaging lifecycle.
- **Fix**: Added automatic `MessageReceipt` creation upon message dispatch and update on `message:read`. Added `Notification` creation on direct message and group events, plus dedicated notification routes (`GET /api/notifications`, `PUT /api/notifications/read-all`).
- **Verification**: Automated test Section 12 verifies notification retrieval and mark-as-read endpoints.

---

### BUG-10: Missing Password Reset & Recovery
- **Severity**: **MEDIUM**
- **Affected File**: `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`, `client.html`
- **Root Cause**: No endpoints or UI existed for forgot password or password reset.
- **Fix**: Implemented `POST /api/auth/forgot-password` (token generation), `POST /api/auth/reset-password` (token validation, password re-hash with Scrypt, and session invalidation), and added a tab in the frontend Auth Modal.
- **Verification**: Automated test Section 11 verifies full reset lifecycle.
