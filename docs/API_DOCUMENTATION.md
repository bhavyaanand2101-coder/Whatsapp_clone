# WhatsApp Web REST API Specification (v1 & Legacy)

## Base URLs
- **Current Version (v1)**: `http://localhost:5050/api/v1`
- **Backward-Compatible Legacy**: `http://localhost:5050/api`

---

## 1. System & Health

### `GET /api/v1/health`
Checks server, database, and socket connectivity.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "application": "WhatsApp Full-Stack Web Platform",
  "course": "Web Dev - III (ETCCWD303)",
  "units": ["Foundations", "Express REST", "MongoDB & Auth", "AI, RAG & Deployment"],
  "activeSockets": 1,
  "uptime": 120,
  "timestamp": "2026-11-23T11:50:00.000Z",
  "database": "connected",
  "version": "2.0.0"
}
```

---

## 2. Authentication & Profile (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Registers a new user account with Scrypt password hashing.
- **Request Body**:
```json
{
  "username": "alex_dev",
  "email": "alex@whatsapp.prod",
  "password": "Password123!",
  "displayName": "Alex Dev",
  "phone": "+91 98765 43210",
  "about": "Available"
}
```
- **Response `201 Created`**: Returns user profile and initial access/refresh tokens.

### `POST /api/v1/auth/login`
Authenticates existing user with timing-safe password hash verification.
- **Request Body**:
```json
{
  "identifier": "alex_dev",
  "password": "Password123!"
}
```
- **Response `200 OK`**: Returns access token and rotating refresh token.

### `POST /api/v1/auth/refresh`
Rotates refresh token and issues a new access token.
- **Request Body**: `{ "refreshToken": "..." }`
- **Response `200 OK`**: `{ "tokens": { "accessToken": "...", "refreshToken": "..." } }`

### `GET /api/v1/auth/me`
Fetches authenticated user identity.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Sanitized user profile without passwordHash.

### `PUT /api/v1/auth/profile`
Updates current user status, avatar, phone, or display name.

### `POST /api/v1/auth/change-password`
Changes user password securely.
- **Request Body**: `{ "currentPassword": "...", "newPassword": "..." }`
- **Response `200 OK`**: Revokes previous sessions and confirms update.

### `POST /api/v1/auth/logout-all`
Revokes all active sessions for the user across all devices.

### `POST /api/v1/auth/deactivate`
Deactivates user account and terminates active sessions.

### `POST /api/v1/auth/forgot-password`
Generates a cryptographically secure 1-hour password reset token.

### `POST /api/v1/auth/reset-password`
Resets user password using the valid reset token.

### `POST /api/v1/auth/users/:targetUserId/block`
Blocks a contact, preventing direct messaging.

### `DELETE /api/v1/auth/users/:targetUserId/block`
Unblocks a previously blocked contact.

---

## 3. Conversations & Channels (`/api/v1/conversations`)

### `GET /api/v1/conversations`
Retrieves all conversations user participates in, sorted by latest message.

### `GET /api/v1/conversations/:id`
Retrieves single conversation with participant and admin details (IDOR protected).

### `POST /api/v1/conversations/direct`
Creates or retrieves a 1-on-1 private conversation with another user.
- **Request Body**: `{ "targetUserId": "<userId>" }`

### `POST /api/v1/conversations/groups`
Creates a new group chat.
- **Request Body**:
```json
{
  "name": "Backend Engineers",
  "description": "Discussion on Node.js and MongoDB",
  "participantIds": ["<userId1>", "<userId2>"]
}
```

### `PUT /api/v1/conversations/groups/:id`
Updates group metadata (name, description, avatar) - Group Admins only.

### `POST /api/v1/conversations/:id/participants`
Adds new members to an existing group - Group Admins only.

### `DELETE /api/v1/conversations/groups/:id/members/:targetUserId`
Removes member from group - Group Admins only.

### `POST /api/v1/conversations/groups/:id/leave`
Leaves group conversation.

### `POST /api/v1/conversations/:id/pin`
Toggles pinned state for current user.

### `POST /api/v1/conversations/:id/mute`
Toggles muted state for current user.

### `POST /api/v1/conversations/:id/archive`
Toggles archived status for current user.

### `DELETE /api/v1/conversations/:id/clear`
Clears chat messages for current user (`deletedFor`).

### `DELETE /api/v1/conversations/:id`
Deletes conversation (or leaves group).

### `GET /api/v1/conversations/:id/media`
Returns media attachments (images, video, voice notes, documents) shared in conversation.

### `POST /api/v1/conversations/groups/:id/invite`
Generates cryptographically random group invitation link.

### `POST /api/v1/conversations/join/:inviteCode`
Allows user to join group via invitation code.

---

## 4. Messages (`/api/v1/messages`)

### `GET /api/v1/messages/:roomId`
Returns paginated message history for a conversation or channel.

### `POST /api/v1/messages`
Sends a new message. Emits over Socket.IO and saves to MongoDB.
- **Request Body**: `{ "conversationId": "...", "text": "...", "mediaType": "text" }`

### `PUT /api/v1/messages/:id`
Edits existing message content (Sender only). Flags `isEdited: true`.

### `POST /api/v1/messages/:id/forward`
Forwards message to target conversation or room.

### `POST /api/v1/messages/:id/react`
Toggles emoji reaction on message.

### `DELETE /api/v1/messages/:id`
Deletes message (`deleteForEveryone: true` for sender, or for current user).

### `GET /api/v1/messages/search?q=:query`
Searches message content using MongoDB text/regex indexing (ReDoS protected).

---

## 5. Media & Uploads (`/api/v1/upload`)

### `POST /api/v1/upload`
Uploads file with MIME validation, cryptographic random naming, and size checks (25MB limit).
- **Form Data**: `file: <binary>`
- **Response `201 Created`**: Returns secure file URL (`/uploads/...`).

---

## 6. AI Assistant & RAG Pipeline (`/api/v1/ai`)

### `POST /api/v1/ai/query`
Processes query against conversation history using Vector/TF-IDF RAG retrieval.

### `GET /api/v1/ai/summarize/:roomId`
Generates structured summary of conversation history using RAG.

### `GET /api/v1/ai/suggestions?messageText=...`
Generates quick contextual reply suggestions.
