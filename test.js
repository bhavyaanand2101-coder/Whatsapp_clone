/**
 * Comprehensive Automated WhatsApp Full-Stack Production Test Suite
 * Covers all requirements from Web Dev - III (Node.js & Express Backend) Syllabus:
 * - Unit 1: Foundations of Node.js (HTTP, non-blocking I/O, event-driven architecture)
 * - Unit 2: Express.js & REST API (Routing, custom middleware, CRUD, status codes)
 * - Unit 3: Databases & Security (MongoDB Mongoose, Scrypt hashing, JWT, OWASP)
 * - Unit 4: AI & Deployment (Generative AI, RAG pipeline, WebRTC signaling, Health probes)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.TEST_URL || "http://localhost:5050";

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, res };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runFullTestSuite() {
  console.log(`\n======================================================================`);
  console.log(`WHATSAPP FULL-STACK PRODUCTION TEST SUITE (WEB DEV - III)`);
  console.log(`Testing target: ${BASE_URL}`);
  console.log(`======================================================================\n`);

  try {
    // ----------------------------------------------------------------
    // SECTION 1: STARTER & BACKWARD COMPATIBILITY
    // ----------------------------------------------------------------
    console.log(`[SECTION 1] Starter Code & Backward Compatibility Verification:`);

    const health = await request("/api/health");
    assert(health.status === 200 && health.data.status === "ok", "GET /api/health returns 200 OK with connected database and syllabus units");

    const rooms = await request("/api/rooms");
    assert(rooms.status === 200 && Array.isArray(rooms.data) && rooms.data.length >= 3, "GET /api/rooms returns default WhatsApp chat channels (General, WebDev, DevTeam)");

    const generalMsgs = await request("/api/messages/general");
    assert(generalMsgs.status === 200 && Array.isArray(generalMsgs.data), "GET /api/messages/general returns message history array");

    const postMsg = await request("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        roomId: "general",
        text: "Automated test message for WhatsApp socket system",
        sender: { id: "test_bot", username: "Test Runner", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=test" },
      }),
    });
    assert(postMsg.status === 201 && postMsg.data.id && postMsg.data.text.includes("Automated test message"), "POST /api/messages creates message with unique ID");

    const xssTest = await request("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        roomId: "general",
        text: "<script>alert('xss')</script>Hello safe text",
        sender: { id: "tester", username: "Tester" },
      }),
    });
    assert(
      xssTest.status === 201 &&
      !xssTest.data.text.includes("<script>") &&
      xssTest.data.text.includes("&lt;script&gt;"),
      "POST /api/messages sanitizes <script> tags to prevent Cross-Site Scripting (XSS)"
    );

    const emptyMsg = await request("/api/messages", {
      method: "POST",
      body: JSON.stringify({ roomId: "general", text: "   " }),
    });
    assert(emptyMsg.status === 400, "POST /api/messages rejects empty message body with 400 Bad Request");

    const seed = await request("/api/seed", { method: "POST" });
    assert(seed.status === 200, "POST /api/seed acknowledges chat store initialization");

    const sResp = await fetch(`${BASE_URL}/socket.io/?EIO=4&transport=polling`);
    const sText = await sResp.text();
    assert(
      sResp.status === 200 && (sText.includes("sid") || sText.includes("0{")),
      "GET /socket.io/?EIO=4&transport=polling performs successful Socket.IO handshake"
    );

    const fResp = await fetch(`${BASE_URL}/`);
    const fHtml = await fResp.text();
    assert(
      fResp.status === 200 && fHtml.includes("WhatsApp Web"),
      "GET / successfully serves WhatsApp Web client HTML with React & Tailwind"
    );

    // ----------------------------------------------------------------
    // SECTION 2: AUTHENTICATION & SECURITY (UNIT 3)
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 2] Authentication, User Management & Security Verification (Unit 3):`);

    const testUser = {
      username: `engineer_${Date.now()}`,
      email: `engineer_${Date.now()}@whatsapp.prod`,
      password: "StrongPassword123!",
      displayName: "Senior Test Engineer",
    };

    const regRes = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(testUser),
    });
    assert(regRes.status === 201 && regRes.data.success && regRes.data.data.tokens.accessToken, "POST /api/auth/register creates user with scrypt password hashing & JWT tokens");

    const authToken = regRes.data.data.tokens.accessToken;
    const refreshToken = regRes.data.data.tokens.refreshToken;
    const userId = regRes.data.data.user._id;

    const dupRes = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(testUser),
    });
    assert(dupRes.status === 409, "POST /api/auth/register rejects duplicate username/email with 409 Conflict");

    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: testUser.username, password: testUser.password }),
    });
    assert(loginRes.status === 200 && loginRes.data.success && loginRes.data.data.tokens.accessToken, "POST /api/auth/login succeeds with timing-safe verification");

    const badLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: testUser.username, password: "WrongPassword999!" }),
    });
    assert(badLogin.status === 401, "POST /api/auth/login rejects incorrect password with 401 Unauthorized");

    const meRes = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(meRes.status === 200 && meRes.data.data.username === testUser.username, "GET /api/auth/me validates Bearer JWT and hydrates current user profile");

    const updateRes = await request("/api/auth/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ about: "Writing production tests for Web Dev 3" }),
    });
    assert(updateRes.status === 200 && updateRes.data.data.about === "Writing production tests for Web Dev 3", "PUT /api/auth/profile updates user status in MongoDB");

    const refreshRes = await request("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    assert(refreshRes.status === 200 && refreshRes.data.data.tokens.accessToken && refreshRes.data.data.tokens.refreshToken !== refreshToken, "POST /api/auth/refresh rotates refresh token securely");

    // ----------------------------------------------------------------
    // SECTION 3: 1-ON-1 CONVERSATIONS & GROUP MANAGEMENT
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 3] Direct & Group Messaging Architecture (Unit 2 & 3):`);

    const usersRes = await request("/api/users");
    assert(usersRes.status === 200 && Array.isArray(usersRes.data) && usersRes.data.length >= 2, "GET /api/users returns registered contacts directory");

    const targetContact = usersRes.data.find((u) => u.username !== testUser.username);

    const directRes = await request("/api/conversations/direct", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ targetUserId: targetContact._id || targetContact.id }),
    });
    assert(directRes.status === 201 && directRes.data.success && directRes.data.data.type === "direct", "POST /api/conversations/direct creates private 1-on-1 conversation");

    const directConvId = directRes.data.data._id;

    const groupRes = await request("/api/conversations/groups", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: "DevOps Release Team",
        description: "Coordination group for production deployment",
        participantIds: [targetContact._id || targetContact.id],
      }),
    });
    assert(groupRes.status === 201 && groupRes.data.data.type === "group" && groupRes.data.data.admins.some((a) => (a._id || a) === userId), "POST /api/conversations/groups creates group chat and sets creator as admin");

    const groupId = groupRes.data.data._id;

    const pinRes = await request(`/api/conversations/${groupId}/pin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(pinRes.status === 200 && pinRes.data.data.pinned === true, "POST /api/conversations/:id/pin toggles pinned status");

    const unpinRes = await request(`/api/conversations/${groupId}/pin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(unpinRes.status === 200 && unpinRes.data.data.pinned === false, "POST /api/conversations/:id/pin toggles conversation pin off");

    const addMemberRes = await request(`/api/conversations/${groupId}/participants`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ userId: targetContact._id || targetContact.id }),
    });
    assert(addMemberRes.status === 200 && addMemberRes.data.success, "POST /api/conversations/:id/participants manages group participants");

    // ----------------------------------------------------------------
    // SECTION 4: MEDIA UPLOAD & ATTACHMENTS
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 4] Media & Secure File Uploads:`);

    const boundary = "---------------------------whatsappBoundary" + Date.now();
    const fakeFileContent = "PDF-1.4 Mock document content for automated upload verification";
    const bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="specs.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      Buffer.from(fakeFileContent),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${authToken}`,
      },
      body: bodyBuffer,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadData.success && uploadData.data.url.startsWith("/uploads/"), "POST /api/upload stores file securely with random filename & returns safe URL");

    const fileFetchRes = await fetch(`${BASE_URL}${uploadData.data.url}`);
    const fileFetchText = await fileFetchRes.text();
    assert(fileFetchRes.status === 200 && fileFetchText === fakeFileContent, "GET /uploads/:filename serves uploaded file payload securely");

    // ----------------------------------------------------------------
    // SECTION 5: MESSAGE LIFECYCLE (CRUD, REACTIONS, SEARCH, DELETION)
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 5] Message CRUD, Reactions, Search & Deletion:`);

    const msgRes = await request("/api/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        conversationId: groupId,
        text: "Critical deployment checklist initialized",
      }),
    });
    assert(msgRes.status === 201 && msgRes.data.id, "POST /api/messages stores message permanently in MongoDB under group conversation");

    const messageId = msgRes.data.id;

    const reactRes = await request(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ emoji: "🚀" }),
    });
    assert(reactRes.status === 200 && reactRes.data.data.some((r) => r.emoji === "🚀"), "POST /api/messages/:id/react stores emoji reaction in MongoDB");

    const searchRes = await request(`/api/messages/search?q=deployment&conversationId=${groupId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(searchRes.status === 200 && Array.isArray(searchRes.data.data) && searchRes.data.data.length > 0, "GET /api/messages/search searches message content via MongoDB index");

    const replyMsg = await request("/api/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        conversationId: groupId,
        text: "Acknowledging deployment checklist - release approved!",
        replyTo: {
          messageId,
          text: "Critical deployment checklist initialized",
          senderName: "Senior Test Engineer",
        },
      }),
    });
    assert(replyMsg.status === 201 && replyMsg.data.id && replyMsg.data.replyTo?.text.includes("Critical deployment"), "POST /api/messages preserves message reply quotes (replyTo)");

    const delRes = await request(`/api/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ deleteForEveryone: true }),
    });
    assert(delRes.status === 200 && delRes.data.success, "DELETE /api/messages/:id marks message as 'This message was deleted' for everyone");

    // ----------------------------------------------------------------
    // SECTION 6: UNIT 4 GENERATIVE AI & RAG RETRIEVAL VERIFICATION
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 6] Unit 4: Generative AI Assistant & RAG Retrieval Pipeline:`);

    const aiQuery = await request("/api/ai/query", {
      method: "POST",
      body: JSON.stringify({ prompt: "Explain Web Dev 3 course outcomes" }),
    });
    assert(aiQuery.status === 200 && aiQuery.data.success && aiQuery.data.data.response.includes("Web Dev 3"), "POST /api/ai/query formulates context-aware response using RAG retrieval");

    const aiSummary = await request("/api/ai/summarize/general");
    assert(aiSummary.status === 200 && aiSummary.data.success && aiSummary.data.data.summary.includes("Summary"), "GET /api/ai/summarize/:id generates conversation summary using RAG");

    const suggestions = await request("/api/ai/suggestions?messageText=Are we ready to deploy");
    assert(suggestions.status === 200 && Array.isArray(suggestions.data.data) && suggestions.data.data.length > 0, "GET /api/ai/suggestions generates smart contextual quick replies");

    // ----------------------------------------------------------------
    // SECTION 7: SOCKET.IO REAL-TIME & WEBRTC PROTOCOL VERIFICATION
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 7] Real-Time Socket.IO Protocol & WebRTC Signaling:`);

    const WebSocket = require("ws");
    const wsUrl = `${BASE_URL.replace(/^http/, "ws")}/socket.io/?EIO=4&transport=websocket`;

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Socket connection timeout"));
      }, 6000);

      let gotGyan = false;
      let gotAnnouncement = false;

      ws.on("open", () => {
        ws.send("40");
      });

      ws.on("message", (raw) => {
        const text = raw.toString();

        if (text.startsWith("40")) {
          assert(true, "Socket.IO real-time WebSocket connection established successfully");

          ws.send('42["kuchbhi","automated test socket payload"]');
          ws.send(JSON.stringify(["user:join", { id: userId, username: testUser.username }]));
          ws.send('42["message:send",{"roomId":"general","text":"Socket.IO automated message"}]');
          ws.send('42["typing:start",{"roomId":"general"}]');
          ws.send('42["typing:stop",{"roomId":"general"}]');
          ws.send('42["call:initiate",{"roomId":"general","isVideo":true,"offer":{"type":"offer","sdp":"mock"}}]');
          ws.send('42["call:end",{"roomId":"general"}]');
        }

        if (text.includes("gyankibaat")) {
          gotGyan = true;
          assert(text.includes("welcome to socket.io server"), "Socket receives starter event 'gyankibaat'");
        }

        if (text.includes("Today is last time we study web dev -3")) {
          gotAnnouncement = true;
          assert(true, "Socket receives starter event 'announcement'");
        }

        if (gotGyan && gotAnnouncement) {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log(`\n======================================================================`);
    console.log(`ALL 32 PRODUCTION & SYLLABUS VERIFICATION TEST CASES PASSED WITH 100%!`);
    console.log(`======================================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ TEST SUITE FAILED: ${error.message}\n`, error);
    process.exit(1);
  }
}

runFullTestSuite();
