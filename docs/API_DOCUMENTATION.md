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
  "timestamp": "2026-11-21T16:40:00.000Z",
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
Authenticates existing user.
- **Request Body**:
```json
{
  "identifier": "alex_dev",
  "password": "Password123!"
}
```
- **Response `200 OK`**: Returns access token (15m validity) and refresh token (7d validity).

### `POST /api/v1/auth/refresh`
Rotates refresh token and issues a new access token.
- **Request Body**: `{ "refreshToken": "..." }`
- **Response `200 OK`**: `{ "tokens": { "accessToken": "...", "refreshToken": "..." } }`

### `GET /api/v1/auth/me`
Fetches authenticated user identity.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: User profile object without passwordHash.

### `PUT /api/v1/auth/profile`
Updates current user status, avatar, or display name.

---

## 3. Conversations & Channels (`/api/v1/conversations`)

### `GET /api/v1/conversations`
Retrieves all conversations user participates in, sorted by latest message.

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

### `POST /api/v1/conversations/:id/participants`
Adds new members to an existing group.

### `POST /api/v1/conversations/:id/pin`
Toggles conversation pinned status.

---

## 4. Messages (`/api/v1/messages`)

### `GET /api/v1/messages/:roomId`
Fetches paginated message history for a conversation or starter room slug (`general`, `webdev`, `devteam`).

### `POST /api/v1/messages`
Sends a new message.
- **Request Body**:
```json
{
  "conversationId": "<convId>",
  "roomId": "general",
  "text": "Hello world",
  "mediaType": "text",
  "replyTo": {
    "messageId": "<msgId>",
    "text": "Parent text",
    "senderName": "Bhavya"
  }
}
```

### `POST /api/v1/messages/:id/react`
Adds or toggles an emoji reaction.
- **Request Body**: `{ "emoji": "👍" }`

### `DELETE /api/v1/messages/:id`
Deletes a message.
- **Request Body**: `{ "deleteForEveryone": true }`

### `GET /api/v1/messages/search?q=keyword`
Performs full-text search across messages.

---

## 5. Media Upload (`/api/v1/upload`)

### `POST /api/v1/upload`
Uploads a document, image, or audio recording.
- **Headers**: `Content-Type: multipart/form-data`
- **Form Field**: `file`
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "url": "/uploads/1732207200000-84729482.pdf",
    "originalName": "notes.pdf",
    "mimeType": "application/pdf",
    "size": 104857
  }
}
```

---

## 6. Generative AI & RAG Engine (`/api/v1/ai`)

### `POST /api/v1/ai/query`
Submits a query to the Meta AI RAG engine.
- **Request Body**: `{ "prompt": "What are the outcomes of Web Dev 3?" }`

### `GET /api/v1/ai/summarize/:conversationId`
Generates an AI executive summary of past messages in the conversation.

### `GET /api/v1/ai/suggestions?messageText=text`
Returns smart quick replies based on incoming message context.
