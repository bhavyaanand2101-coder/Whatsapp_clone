# System Architecture & Technical Design: WhatsApp Web Full-Stack

## 1. High-Level Architectural Overview

The application is structured as a modular, event-driven full-stack messaging platform adhering to the layered architectural pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                 React 18 Single-Page Client                 │
│       (Tailwind CSS, Lucide Icons, Socket.IO Client)        │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP / REST                   │ WebSockets (Socket.IO)
               ▼                               │ WebRTC Signaling
┌──────────────────────────────────────────────┴──────────────┐
│                  Express.js Gateway / API                   │
│   (Helmet, CORS, Cookie-Parser, Rate-Limit, BodyParsers)    │
├─────────────────────────────────────────────────────────────┤
│                     Middleware Pipeline                     │
│  (Auth Verification, Zod Validation, Request Logger, Error) │
├─────────────────────────────────────────────────────────────┤
│                    Application Controllers                  │
│   (Auth, Conversation, Message, Upload, AI, Health)         │
├─────────────────────────────────────────────────────────────┤
│                      Domain Services                        │
│         (CryptoAuth, RAG Engine, Sanitize, Socket)          │
├─────────────────────────────────────────────────────────────┤
│                     MongoDB / Mongoose                      │
│ (User, Conversation, Message, Session, Blocked, Audit, etc) │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Backend Layer (`server.js` & `src/`)
- **`server.js`**: Application entrypoint. Boots HTTP server, attaches Socket.IO, mounts security middleware, static directories, and route gateways.
- **`src/config/`**:
  - `env.js`: Centralized environment variable loader with production defaults.
  - `db.js`: Resilient Mongoose connection wrapper with auto-reconnect and index synchronization.
- **`src/middleware/`**:
  - `logger.middleware.js`: Non-blocking request logger adhering to Unit 2 standards.
  - `auth.middleware.js`: Bearer JWT token verification supporting both strict (`requireAuth`) and fallback (`optionalAuth`) modes.
  - `rateLimiter.middleware.js`: Distributed-ready IP-based rate limiters preventing brute-force and DoS.
  - `upload.middleware.js`: Multer multipart form-data processor with strict mime-type validation and disk storage.
  - `validate.middleware.js`: Schema validation runner powered by Zod.
  - `error.middleware.js`: Centralized 404 and 500 error dispatchers with sanitized stack traces.
- **`src/controllers/`**:
  - `auth.controller.js`: Handles registration, login, token refresh, logout, profile update, block/unblock.
  - `conversation.controller.js`: Manages 1-on-1 chats, group creation, member updates, pinning, muting.
  - `message.controller.js`: Message creation, retrieval with pagination, reactions, full-text search, soft deletion.
  - `ai.controller.js`: RAG question answering, chat history summarization, quick suggestions.
  - `upload.controller.js`: Media ingestion and secure URI generation.
- **`src/sockets/chat.socket.js`**:
  - Socket.IO connection handling.
  - Starter event compatibility: `gyankibaat`, `kuchbhi`, `join`, `announcement`, `user:join`, `room:join`, `message:send`, `typing:start`, `typing:stop`, `message:read`.
  - WebRTC signaling: `call:initiate`, `call:offer`, `call:answer`, `call:candidate`, `call:end`.

---

## 3. Storage Architecture

- **Primary Database**: MongoDB (Mongoose ODM).
- **Binary Media Storage**: Filesystem-backed private `uploads/` directory with secure pseudo-randomized filenames (`crypto.randomBytes(16)`), protected against path traversal attacks.
- **Cache & Presence**: Dual in-memory Map structure (`activeUsers`, `userSockets`) with support for Redis pub/sub scaling.

---

## 4. Course Syllabus Mapping (Web Dev - III)

| Unit | Syllabus Requirement | Implemented Feature | Location |
|---|---|---|---|
| **Unit 1** | Foundations of Node.js: HTTP, FS, Path, Events | Native HTTP server, file uploads, event emitters | `server.js`, `src/sockets/chat.socket.js` |
| **Unit 2** | Express.js & REST API Development | RESTful routing, custom middleware, CRUD, status codes | `src/routes/`, `src/controllers/` |
| **Unit 3** | Databases, Authentication & Security | MongoDB, Scrypt, JWT, Sessions, OWASP headers, CORS | `src/models/`, `src/utils/cryptoAuth.js` |
| **Unit 4** | AI, Design & Deployment | RAG pipeline, WebRTC signaling, Docker, Health probes | `src/services/rag.service.js`, `Dockerfile` |
