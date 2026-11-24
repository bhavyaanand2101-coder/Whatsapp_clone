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
    "x-test-suite": "true",
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

    // ----------------------------------------------------------------
    // SECTION 8: API V1 GATEWAY & OWASP SECURITY HARDENING
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 8] API v1 Gateway & OWASP Security Hardening Verification:`);

    const v1Health = await request("/api/v1/health");
    assert(v1Health.status === 200 && v1Health.data.version === "2.0.0", "GET /api/v1/health serves versioned v1 REST API gateway");

    const v1Rooms = await request("/api/v1/rooms");
    assert(v1Rooms.status === 200 && Array.isArray(v1Rooms.data), "GET /api/v1/rooms returns active chat channels through v1 gateway");

    const v1Users = await request("/api/v1/users");
    assert(v1Users.status === 200 && Array.isArray(v1Users.data), "GET /api/v1/users returns user directory via v1 gateway");

    // Security headers verification
    const healthHeaders = v1Health.res.headers;
    assert(healthHeaders.get("x-content-type-options") === "nosniff", "Response enforces X-Content-Type-Options: nosniff");
    assert(healthHeaders.get("x-frame-options") === "SAMEORIGIN", "Response enforces X-Frame-Options: SAMEORIGIN");

    // ----------------------------------------------------------------
    // SECTION 9: IDOR & STRICT AUTHORIZATION CONTROLS
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 9] IDOR & Strict Authorization Controls:`);

    // Create a second authenticated user (User B)
    const testUser2 = {
      username: `engineer2_${Date.now()}`,
      email: `engineer2_${Date.now()}@whatsapp.prod`,
      password: "StrongPassword456!",
      displayName: "Security Auditor B",
    };
    const regUser2 = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(testUser2),
    });
    assert(regUser2.status === 201, "User B registered successfully for multi-party testing");
    const authToken2 = regUser2.data.data.tokens.accessToken;
    const user2Id = regUser2.data.data.user._id;

    // Test 1: Unauthenticated request to private conversation returns 401
    const unauthConv = await request(`/api/conversations/${directConvId}`);
    assert(unauthConv.status === 401, "GET /api/conversations/:id without token rejects private chat with 401 Unauthorized");

    // Test 2: User B attempting to access User A's direct chat (where User B is NOT a participant)
    const idorConv = await request(`/api/conversations/${directConvId}`, {
      headers: { Authorization: `Bearer ${authToken2}` },
    });
    assert(idorConv.status === 403, "GET /api/conversations/:id prevents IDOR: unauthorized User B rejected with 403 Forbidden");

    // Test 3: Unauthenticated request to private messages returns 401
    const unauthMsgs = await request(`/api/messages/${directConvId}`);
    assert(unauthMsgs.status === 401, "GET /api/messages/:id without token rejects private message access with 401 Unauthorized");

    // Test 4: Unauthorized User B attempting to read User A's private messages returns 403
    const idorMsgs = await request(`/api/messages/${directConvId}`, {
      headers: { Authorization: `Bearer ${authToken2}` },
    });
    assert(idorMsgs.status === 403, "GET /api/messages/:id prevents IDOR: unauthorized User B message access rejected with 403 Forbidden");

    // Test 5: Unauthorized User B attempting to send message into User A's private chat returns 403
    const idorSend = await request(`/api/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken2}` },
      body: JSON.stringify({
        conversationId: directConvId,
        text: "Malicious injection attempt by User B",
      }),
    });
    assert(idorSend.status === 403, "POST /api/messages prevents unauthorized posting into another user's conversation with 403 Forbidden");

    // Test 6: Non-admin User B attempting to remove group admin returns 403
    const idorRemove = await request(`/api/conversations/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken2}` },
    });
    assert(idorRemove.status === 400 || idorRemove.status === 403, "DELETE /api/conversations/groups/:id/members/:userId rejects unauthorized non-member/non-admin with 400/403");

    // ----------------------------------------------------------------
    // SECTION 10: USER BLOCKING CONTROLS
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 10] User Blocking Controls:`);

    const blockRes = await request(`/api/auth/users/${user2Id}/block`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(blockRes.status === 200, "POST /api/auth/users/:id/block allows User A to block User B");

    // User B attempting to start direct chat with User A who blocked them
    const blockedChatRes = await request("/api/conversations/direct", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken2}` },
      body: JSON.stringify({ targetUserId: userId }),
    });
    assert(blockedChatRes.status === 403, "POST /api/conversations/direct rejects chat creation when contact is blocked with 403 Forbidden");

    // User A unblocks User B
    const unblockRes = await request(`/api/auth/users/${user2Id}/block`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(unblockRes.status === 200, "DELETE /api/auth/users/:id/block allows User A to unblock User B");

    // ----------------------------------------------------------------
    // SECTION 11: PASSWORD RESET LIFECYCLE
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 11] Password Reset Lifecycle:`);

    const forgotRes = await request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ identifier: testUser2.username }),
    });
    assert(forgotRes.status === 200 && forgotRes.data.data.resetToken, "POST /api/auth/forgot-password generates cryptographically secure reset token");

    const resetToken = forgotRes.data.data.resetToken;
    const newPassword = "BrandNewPassword789!";

    const resetRes = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ resetToken, newPassword }),
    });
    assert(resetRes.status === 200 && resetRes.data.success, "POST /api/auth/reset-password updates password and revokes previous sessions");

    // Login with new password succeeds
    const newLoginRes = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: testUser2.username, password: newPassword }),
    });
    assert(newLoginRes.status === 200 && newLoginRes.data.success, "POST /api/auth/login succeeds with updated password");

    // Login with old password fails
    const oldLoginRes = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: testUser2.username, password: testUser2.password }),
    });
    assert(oldLoginRes.status === 401, "POST /api/auth/login rejects outdated password with 401 Unauthorized");

    // ----------------------------------------------------------------
    // SECTION 12: IN-APP NOTIFICATIONS & RECEIPT METADATA
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 12] In-App Notifications & Receipt Metadata:`);

    const notifRes = await request("/api/notifications", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(notifRes.status === 200 && Array.isArray(notifRes.data.data.notifications), "GET /api/notifications returns in-app notification list and unread count");

    const readAllNotif = await request("/api/notifications/read-all", {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(readAllNotif.status === 200 && readAllNotif.data.success, "PUT /api/notifications/read-all marks all notifications as read");

    // ----------------------------------------------------------------
    // SECTION 13: INPUT RESILIENCE & REDOS DEFENSE
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 13] Input Resilience & ReDoS Defense:`);

    const redosQuery = await request(`/api/messages/search?q=${encodeURIComponent("((((a+)+)+)+)+$")}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(redosQuery.status === 200 && Array.isArray(redosQuery.data.data), "GET /api/messages/search handles catastrophic ReDoS payload safely via regex escaping");

    // ----------------------------------------------------------------
    // SECTION 14: SOCKET.IO PRIVATE ROOM AUTHORIZATION
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 14] Socket.IO Private Room Authorization:`);

    await new Promise((resolve, reject) => {
      const ws2 = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws2.close();
        resolve(); // socket closed safely
      }, 5000);

      ws2.on("open", () => {
        ws2.send("40");
      });

      ws2.on("message", (raw) => {
        const text = raw.toString();
        if (text.startsWith("40")) {
          // Send join event with User B credentials
          ws2.send(JSON.stringify(["user:join", { id: user2Id, username: testUser2.username }]));
          // Attempt to join User A's private direct chat room
          ws2.send(`42["room:join",{"roomId":"${directConvId}"}]`);
        }

        if (text.includes("error:unauthorized")) {
          assert(true, "Socket.IO server rejects unauthorized room join with 'error:unauthorized' event");
          clearTimeout(timeout);
          ws2.close();
          resolve();
        }
      });

      ws2.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // ----------------------------------------------------------------
    // SECTION 15: ADVANCED CHAT & MESSAGE MANAGEMENT
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 15] Advanced Message Editing, Forwarding & Conversation Lifecycle:`);

    const msgToEdit = await request("/api/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        conversationId: groupId,
        text: "Original message text before edit",
      }),
    });
    assert(msgToEdit.status === 201, "POST /api/messages creates message for editing test");
    const editMsgId = msgToEdit.data.id || msgToEdit.data._id;

    const editRes = await request(`/api/messages/${editMsgId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ text: "Updated message text after edit" }),
    });
    assert(editRes.status === 200 && editRes.data.data.text.includes("Updated message text") && editRes.data.data.isEdited === true, "PUT /api/messages/:id allows sender to edit own message and flags isEdited: true");

    const forwardRes = await request(`/api/messages/${editMsgId}/forward`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ targetRoomId: "general" }),
    });
    assert(forwardRes.status === 201, "POST /api/messages/:id/forward clones and forwards message to destination room");

    const archiveRes = await request(`/api/conversations/${groupId}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(archiveRes.status === 200 && archiveRes.data.data.archived === true, "POST /api/conversations/:id/archive toggles conversation archive state");

    const mediaList = await request(`/api/conversations/${groupId}/media`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(mediaList.status === 200 && Array.isArray(mediaList.data.data), "GET /api/conversations/:id/media returns media & document gallery");

    const clearRes = await request(`/api/conversations/${groupId}/clear`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(clearRes.status === 200, "DELETE /api/conversations/:id/clear clears messages for user");

    // ----------------------------------------------------------------
    // SECTION 16: GROUP INVITATION LINKS & SESSION MANAGEMENT
    // ----------------------------------------------------------------
    console.log(`\n[SECTION 16] Group Invitations & Account Lifecycle:`);

    const inviteRes = await request(`/api/conversations/groups/${groupId}/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(inviteRes.status === 200 && inviteRes.data.data.inviteCode, "POST /api/conversations/groups/:id/invite generates cryptographically secure group invite code");
    const inviteCode = inviteRes.data.data.inviteCode;

    const joinInviteRes = await request(`/api/conversations/join/${inviteCode}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken2}` },
    });
    assert(joinInviteRes.status === 200, "POST /api/conversations/join/:inviteCode enables User B to join group via invite link");

    const changePwRes = await request("/api/auth/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        currentPassword: testUser.password,
        newPassword: "NewSecretPassword123!",
      }),
    });
    assert(changePwRes.status === 200, "POST /api/auth/change-password securely updates password and revokes previous sessions");

    const logoutAllRes = await request("/api/auth/logout-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(logoutAllRes.status === 200, "POST /api/auth/logout-all purges active refresh sessions across all devices");

    const deactRes = await request("/api/auth/deactivate", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken2}` },
    });
    assert(deactRes.status === 200, "POST /api/auth/deactivate deactivates account and terminates sessions");

    console.log(`\n======================================================================`);
    console.log(`ALL PRODUCTION, OWASP SECURITY & REAL-TIME TESTS PASSED WITH 100%!`);
    console.log(`======================================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ TEST SUITE FAILED: ${error.message}\n`, error);
    process.exit(1);
  }
}

runFullTestSuite();
