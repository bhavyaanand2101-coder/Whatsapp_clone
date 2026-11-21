# Unit 4: Production Multi-stage Containerization
# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Minimal Secure Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Run as non-root user for security
USER node

# Copy dependencies and application source
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node client.html ./
COPY --chown=node:node server.js ./
COPY --chown=node:node test.js ./

# Create uploads directory with node ownership
USER root
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node

ENV PORT=5050 \
    NODE_ENV=production \
    MONGO_URI=mongodb://mongo:27017/whatsapp_db

EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5050/api/health || exit 1

CMD ["node", "server.js"]
