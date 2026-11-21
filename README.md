# WhatsApp Web Full-Stack Production Platform (Chirp Chat)

A comprehensive, production-grade WhatsApp Web messaging application built for **Web Dev - III (Node.js & Express Backend) — ETCCWD303**.

---

## System Status & Verification

- **Automated Test Suite**: **37 / 37 Tests Passing (100%)** (`node test.js`)
- **Starter Compatibility**: 100% backward compatible with all initial starter Socket.IO events (`gyankibaat`, `kuchbhi`, `join`, `announcement`, etc.)
- **Security Rating**: OWASP Top 10 Hardened (Helmet, Rate Limiting, Scrypt hashing, JWT rotation, XSS sanitization)
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
- Group administration: member invitation, admin promotion, member removal.
- Persistent message storage in MongoDB with pagination.
- Reply quote bubble (`replyTo`) and emoji reactions.
- Real-time double blue checkmarks for read receipts.
- Live typing indicator with auto-clearing timer.
- Soft deletion ("Delete for me" and "Delete for everyone").
- Full-text search across conversations and message history.

### 3. Media & File Sharing
- Secure file upload endpoint with randomized naming and MIME validation.
- Inline rendering for images, videos, audio notes, and downloadable PDF documents.

### 4. WebRTC Voice & Video Calling
- Real-time WebRTC audio and video calling modal.
- Signaling over Socket.IO (`call:initiate`, `call:offer`, `call:answer`, `call:candidate`, `call:end`).

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

---

## Documentation Index

- [Architecture Guide](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/docs/ARCHITECTURE.md)
- [REST API Documentation](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/docs/API_DOCUMENTATION.md)
- [Socket.IO Events Specification](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/docs/SOCKET_EVENTS.md)
- [Database Schema](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/docs/DATABASE_SCHEMA.md)
- [Security Audit & OWASP Report](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/docs/SECURITY_AUDIT.md)
- [Deployment Guide](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/docs/DEPLOYMENT.md)
- [Project Audit](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/PROJECT_AUDIT.md)
- [Development Progress](file:///Users/bhavya/Desktop/%20/Sem_3/Web_Dev_3/WEB_DEV_3/Assignment_4/Whatsapp/DEVELOPMENT_PROGRESS.md)
