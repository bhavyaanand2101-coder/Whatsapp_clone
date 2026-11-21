# WhatsApp Web Production Full-Stack Application
### Course: Web Dev - III (Node.js & Express Backend) — ETCCWD303
**B.Tech CSE (Specialization in AI & ML)**

A production-grade, secure, scalable WhatsApp Web platform built with **Node.js, Express, MongoDB (Mongoose ODM), Socket.IO, WebRTC, Generative AI (RAG Pipeline), and React 18 + Tailwind CSS**.

---

## 1. System Architecture & Component Diagram

```mermaid
flowchart TD
    subgraph Client["WhatsApp Web Client (React 18 + Tailwind)"]
        UI[Authentic WhatsApp UI]
        SocketClient[Socket.IO Client]
        RTCClient[WebRTC PeerConnection]
    end

    subgraph Backend["Node.js & Express Production Server (Port 5050)"]
        Logger[Custom Request Logger (Lab 1)]
        Router[Modular REST Routers]
        AuthMid[JWT & Scrypt Auth Middleware]
        UploadMid[Multer Secure Storage]
        SocketServer[Socket.IO Real-Time Engine]
        RTCBroker[WebRTC Signaling Broker]
        AIService[Meta AI Assistant]
        RAGEngine[RAG Pipeline Service]
    end

    subgraph Database["MongoDB Database (Mongoose ODM)"]
        UserCol[(Users Collection)]
        SessionCol[(Sessions TTL Store)]
        ConvCol[(Conversations Collection)]
        MsgCol[(Messages Collection)]
    end

    subgraph Storage["Private File System"]
        UploadsDir[/uploads/ (Cryptographic Hashes)]
    end

    UI --> Router
    Router --> Logger
    Logger --> AuthMid
    AuthMid --> UserCol
    AuthMid --> SessionCol
    Router --> UploadMid
    UploadMid --> UploadsDir
    SocketClient <--> SocketServer
    RTCClient <--> RTCBroker
    SocketServer <--> ConvCol
    SocketServer <--> MsgCol
    SocketServer <--> AIService
    AIService <--> RAGEngine
    RAGEngine <--> MsgCol
```

---

## 2. Course Syllabus Mapping & Theoretical Implementation

### Unit 1: Foundations of Node.js
- **Backend Fundamentals & HTTP**: Pure Node.js `http.createServer` combined with Express request/response pipeline.
- **Event-Driven Architecture**: Native non-blocking asynchronous event loop, Socket.IO custom event emitters (`gyankibaat`, `announcement`, `message:send`).
- **ES6+ Syntax**: `async/await`, Promises, destructuring, rest/spread operators, arrow functions.
- **OOP in JavaScript**: Object-Oriented design with `class RAGService` and `class AIService` utilizing constructors, instance methods, and encapsulated state.
- **Core Node.js Modules**:
  - `fs`: Safe directory verification and file streaming.
  - `http`: Underlying server powering both REST and WebSockets.
  - `path`: Cross-platform path normalization avoiding directory traversal.
  - `url`: Query string and path extraction.

### Unit 2: Express.js & REST API Development
- **Modular Routing**: Layered separation across `src/routes/` (`auth.routes.js`, `conversation.routes.js`, `message.routes.js`, `upload.routes.js`, `ai.routes.js`).
- **Middleware Chain**:
  - Built-in: `express.json({ limit: '10mb' })`, `express.urlencoded()`, `express.static()`.
  - Custom: `requestLogger` (logs timestamp, method, path, response status, and duration in ms).
  - Error Handling: Centralized 404 (`notFoundHandler`) and global 500 (`errorHandler`).
- **REST Principles & Full CRUD API**:
  - **Create**: `POST /api/messages`, `POST /api/conversations/groups`, `POST /api/auth/register` (HTTP 201).
  - **Read**: `GET /api/messages/:roomId`, `GET /api/conversations`, `GET /api/users` (HTTP 200).
  - **Update**: `PUT /api/auth/profile`, `PUT /api/conversations/groups/:id` (HTTP 200).
  - **Delete**: `DELETE /api/messages/:id` (delete for me / everyone), `DELETE /api/conversations/groups/:id/members/:targetUserId` (HTTP 200).
- **Postman Collection**: Exported in `postman_collection.json` for testing all endpoints.

### Unit 3: Databases, Authentication & Security
- **MongoDB & Mongoose ODM**:
  - Connection pooling with automatic reconnection in `src/config/db.js`.
  - Schema design with strict field validation (regex, minlength, maxlength).
  - Referenced relationships (`type: mongoose.Schema.Types.ObjectId, ref: 'User'`).
  - Querying & Populating: `.find()`, `.populate('participants')`, `.populate('admins')`.
- **Authentication & Cryptography**:
  - NIST & OWASP approved **Scrypt** memory-hard password hashing with 16-byte random salt.
  - **Timing-safe comparison** via `crypto.timingSafeEqual` preventing timing side-channel attacks.
  - **RFC 7519 HMAC-SHA256 JWT**: Access token generation and signature verification with expiration.
  - **Refresh Token Rotation**: Cryptographically random 256-bit refresh tokens with SHA-256 hashing and MongoDB TTL auto-expiration.
- **Security Hardening**:
  - HTTP Security Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.
  - XSS Protection: HTML entity neutralization (`< > & " '`).
  - IDOR Protection: Verification of conversation participant membership before query execution.
  - Upload Whitelist: Extension and MIME type validation, 25MB limit, randomized storage filenames.

### Unit 4: AI, Design & Deployment
- **Generative AI & RAG Pipeline (Retrieval-Augmented Generation)**:
  - **Meta AI Assistant** embedded into WhatsApp (`@Meta AI` or dedicated `meta-ai` room).
  - **RAG Architecture**: Chunks conversation history and knowledge base documents, applies lexical similarity scoring (TF-IDF), retrieves top-k relevant context, and generates grounded intelligent answers.
  - **Chat Summarization**: Extractive and thematic conversation summarizer via `GET /api/ai/summarize/:conversationId`.
  - **Smart Reply Suggestions**: Dynamic contextual quick replies via `GET /api/ai/suggestions`.
- **WebRTC Peer-to-Peer Communication**:
  - Socket.IO signaling broker for `call:initiate`, `call:answer`, `call:ice_candidate`, `call:end`.
  - Interactive audio and video calling modal with camera and microphone toggles.
- **Docker Containerization**:
  - Multi-stage `Dockerfile` with non-root security (`USER node`).
  - `docker-compose.yml` orchestrating application and MongoDB containers.
- **Automated Verification**:
  - Comprehensive unit and integration test suite in `test.js` covering 28 verification cases with 100% pass rate.

---

## 3. Starter Code Compatibility (Preserved 100%)

All starter events and REST contracts remain operational:

| Event / Endpoint | Type | Purpose |
|---|---|---|
| `gyankibaat` | Socket Server -> Client | Emitted on handshake: `"welcome to socket.io server"` |
| `join` | Socket Broadcast | Broadcasts `"New User Joined"` to peers |
| `announcement` | Socket Emit | Broadcasts `"Today is last time we study web dev -3"` & join alerts |
| `kuchbhi` | Socket Client -> Server | Client test payload acknowledgment |
| `user:join` | Socket Client -> Server | Sets up user profile and returns active rooms |
| `room:join` | Socket Client -> Server | Switches active chat room and returns history |
| `message:send` | Socket Client -> Server | Broadcasts message and stores in MongoDB |
| `typing:start` / `stop` | Socket Client -> Server | Real-time typing indicators |
| `message:read` | Socket Client -> Server | Read receipt updating to double blue checkmarks `✓✓` |
| `GET /api/health` | REST | Server status, active sockets, database health, uptime |
| `GET /api/rooms` | REST | List of chat channels (`general`, `webdev`, `devteam`) |
| `GET /api/messages/:roomId` | REST | Returns chronological message history array |
| `POST /api/messages` | REST | Sends message with XSS sanitization and returns 201 |
| `POST /api/seed` | REST | Acknowledges chat store initialization |

---

## 4. Lab Experiments Documentation

### Lab 1: Simple Express API (Unit 1 & 2)
- Express server configured on port `5050`.
- GET and POST endpoints for messaging and rooms.
- Custom logging middleware (`requestLogger`) tracking execution duration.
- 404 handler (`notFoundHandler`) and centralized error handler (`errorHandler`).

### Lab 2: CRUD API with MongoDB (Unit 2 & 3)
- Mongoose data models for `User`, `Conversation`, `Message`, `Session`.
- Full CRUD operations implemented:
  - Create: `.create()` for users, conversations, messages.
  - Read: `.find()`, `.findById()`, `.findOne()`, with `.populate()`.
  - Update: `.findByIdAndUpdate()`, `.updateOne()`.
  - Delete: `.deleteOne()`, soft-delete with `isDeletedForEveryone: true`.

---

## 5. Quickstart & How to Run

### 1. Install & Start Locally
```bash
cd "WEB_DEV_3/Assignment_4/Whatsapp"
node server.js
```
The application will launch on `http://localhost:5050` and connect to MongoDB.

### 2. Run Automated Verification Test Suite
```bash
node test.js
```
Executes all 28 automated test cases verifying Units 1-4 and WhatsApp features.

### 3. Run with Docker Compose (Unit 4)
```bash
docker-compose up --build
```

### 4. Demo Personas
Click the top-left avatar in the web UI to 1-click switch between personas:
- **Bhavya**: `bhavya@whatsapp.local` (Password: `Password123!`)
- **Aarav Sharma**: `aarav@whatsapp.local` (Password: `Password123!`)
- **Priya Nair**: `priya@whatsapp.local` (Password: `Password123!`)
- **Rohan Verma**: `rohan@whatsapp.local` (Password: `Password123!`)
- **Meta AI**: Intelligent RAG assistant room (`meta-ai`)
