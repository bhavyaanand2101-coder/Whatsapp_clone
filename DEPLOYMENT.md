# Deployment & Operations Guide: WhatsApp Web Full-Stack

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **MongoDB**: v6.0 or higher running locally or via MongoDB Atlas.
- **Docker & Docker Compose**: (Optional, for containerized deployments).

---

## 2. Local Environment Setup

1. **Clone repository and navigate to folder**:
   ```bash
   cd "Assignment_4/Whatsapp"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start MongoDB**:
   ```bash
   # On macOS Homebrew
   brew services start mongodb-community
   ```

5. **Start Application Server**:
   ```bash
   # Production mode
   node server.js

   # Development mode with auto-reload
   npm run dev
   ```

6. **Verify Server**:
   Open browser to `http://localhost:5050` or run test suite:
   ```bash
   node test.js
   ```

---

## 3. Containerized Deployment (Docker & Docker Compose)

The project includes production-ready container definitions:
- `Dockerfile`: Multi-stage, non-root user `node` execution with Alpine Linux.
- `docker-compose.yml`: Automated orchestration of both WhatsApp Web Node.js server and MongoDB.

### Commands:
```bash
# Build and run containers in detached mode
docker compose up -d --build

# Inspect running containers
docker compose ps

# View live application logs
docker compose logs -f whatsapp-web

# Stop containers
docker compose down
```

---

## 4. Production Cloud Deployment (Render / Railway / Vercel / AWS)

### Environment Variables for Cloud:
- `PORT`: Set dynamically by host (e.g. 10000 on Render).
- `NODE_ENV`: `production`.
- `MONGO_URI`: `mongodb+srv://<user>:<password>@cluster.mongodb.net/whatsapp_prod?retryWrites=true&w=majority`.
- `JWT_SECRET`: 64-character random cryptographic secret.

### Health Check Endpoint:
Configure health monitoring to ping:
`GET /api/v1/health`
Expects `200 OK` with JSON `{ "status": "ok", "database": "connected" }`.
