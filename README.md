# WhatsApp Web Full-Stack Production Platform (Chirp Chat)

A comprehensive, production-grade WhatsApp Web messaging application built for **Web Dev - III (Node.js & Express Backend) — ETCCWD303**.

---

## System Status & Verification

- **Automated Test Suite**: **66 / 66 Tests Passing (100%)** (`node test.js`)
- **End-to-End Browser Automation**: **8 / 8 User Journeys Verified** with Playwright & Google Chrome
- **Starter Compatibility**: 100% backward compatible with all initial starter Socket.IO events (`gyankibaat`, `kuchbhi`, `join`, `announcement`, etc.)
- **Security Rating**: OWASP Top 10 Hardened (Helmet, Rate Limiting, Scrypt hashing, JWT rotation, XSS sanitization, IDOR prevention, ReDoS protection)
- **Containerization**: Docker & Docker Compose configured and verified.

---

## Course Curriculum Alignment (Units 1 - 4)

| Unit | Syllabus Topics | Implemented Modules & Features |
|---|---|---|
| **Unit 1: Foundations of Node.js** | HTTP fundamentals, event-driven architecture, core modules (`http`, `fs`, `path`, `url`, `events`) | Native HTTP server, file uploads via FS stream, custom Socket event emitters (`server.js`, `src/sockets/chat.socket.js`) |
| **Unit 2: Express.js & REST API** | Express routing, route params, custom logging, centralized error handling, full CRUD APIs | Dual-mounted REST gateways (`/api` and `/api/v1`), Zod validation, request logger (`src/routes/`, `src/controllers/`) |
| **Unit 3: Databases & Security** | MongoDB & Mongoose ODM, Schema design, Scrypt password hashing, JWT authentication, sessions, role-based middleware, OWASP security | User, Conversation, Message, Session models, timing-safe crypto auth, rate limiters (`src/models/`, `src/utils/cryptoAuth.js`) |
| **Unit 4: AI & Deployment** | Generative AI integration, Retrieval-Augmented Generation (RAG), WebRTC audio/video calling, Docker containerization, Health probes | Meta AI assistant, RAG chat summarization, WebRTC signaling, Dockerfile & Compose (`src/services/rag.service.js`, `Dockerfile`) |

---

## Key Feature Capabilities

### 1. Real-Time WhatsApp Web Interface
- Emerald green header and signature WhatsApp chat styling.
- Responsive split-panel layout: chat list, active conversation panel, contact info drawer.
- Mobile-responsive view with back navigation (`←`).
- Live persona switcher between demo contacts (`bhavya`, `priya`, `arjun`, `rohan`, `meta_ai`).

### 2. Messaging & Conversations
- 1-on-1 private chats and multi-user group chats.
- Group administration: member invitation, invite links, admin promotion, member removal.
- Persistent message storage in MongoDB with pagination.
- Message editing: sender can edit message text with live broadcast and `(edited)` indicator.
- Message forwarding: quick forward modal to dispatch messages to any room or chat.
- Message copy: one-click copy to clipboard.
- Reply quote bubble (`replyTo`) and emoji reactions.
- Real-time double blue checkmarks for read receipts.
- Live typing indicator with auto-clearing timer.
- Soft deletion ("Delete for me" and "Delete for everyone").
- Chat management: archive chats, clear chat history, pin chats, mute notifications.
- Full-text search across conversations and message history.

### 3. Media & File Sharing
- Secure file upload endpoint with randomized naming and MIME validation.
- Inline rendering for images, videos, audio notes, and downloadable PDF documents.
- Dedicated Media Gallery view in chat header displaying all images, videos, audio, and documents.

### 4. WebRTC Voice & Video Calling
- Real-time WebRTC audio and video calling modal with local and remote video elements.
- P2P STUN-assisted media streaming.
- Signaling over Socket.IO (`call:initiate`, `call:answer`, `call:ice_candidate`, `call:reject`, `call:end`).

### 5. Generative AI Assistant (Meta AI & RAG Pipeline)
- Dedicated `@Meta AI` assistant contact in chat sidebar.
- RAG question-answering with syllabus domain knowledge.
- Conversation history auto-summarization (`GET /api/v1/ai/summarize/:conversationId`).
- Contextual quick-reply suggestions.

---

## Quick Start Guide

### 1. Installation
```bash
git clone <repo-url>
cd Assignment_4/Whatsapp
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

### 3. Start Application
```bash
# Run server
node server.js
```
The server will start on `http://localhost:5050`. Open this URL in any modern browser.

### 4. Run Automated Test Suite
```bash
node test.js
```

---

## Docker Execution

```bash
docker compose up -d --build
```
Inspect logs:
```bash
docker compose logs -f
```
