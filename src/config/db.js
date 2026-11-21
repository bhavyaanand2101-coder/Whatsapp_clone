const mongoose = require("mongoose");
const env = require("./env");
const { hashPassword } = require("../utils/cryptoAuth");

async function seedDatabase(User, Conversation, Message) {
  try {
    const userCount = await User.countDocuments();
    let seedUsers = [];

    if (userCount === 0) {
      console.log("[DB Seed] Creating default WhatsApp demo users...");
      const commonPasswordHash = hashPassword("Password123!");

      seedUsers = await User.create([
        {
          username: "bhavya",
          email: "bhavya@whatsapp.local",
          passwordHash: commonPasswordHash,
          displayName: "Bhavya",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
          about: "Coding WebSockets in Sem 3",
          phone: "+91 98111 22233",
          online: true,
        },
        {
          username: "aarav",
          email: "aarav@whatsapp.local",
          passwordHash: commonPasswordHash,
          displayName: "Aarav Sharma",
          avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80",
          about: "MERN Stack Faculty",
          phone: "+91 98222 33344",
          online: false,
        },
        {
          username: "priya",
          email: "priya@whatsapp.local",
          passwordHash: commonPasswordHash,
          displayName: "Priya Nair",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
          about: "Reviewing assignment pull requests",
          phone: "+91 98333 44455",
          online: false,
        },
        {
          username: "rohan",
          email: "rohan@whatsapp.local",
          passwordHash: commonPasswordHash,
          displayName: "Rohan Verma",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
          about: "Available for code review",
          phone: "+91 98444 55566",
          online: false,
        },
        {
          username: "meta_ai",
          email: "ai@meta.whatsapp.local",
          passwordHash: commonPasswordHash,
          displayName: "Meta AI",
          avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
          about: "Always here to help with answers, summaries & ideas",
          phone: "+1 800 555 0199",
          isAI: true,
          online: true,
        },
      ]);
      console.log(`[DB Seed] Seeded ${seedUsers.length} initial users.`);
    } else {
      seedUsers = await User.find().limit(5);
    }

    const convCount = await Conversation.countDocuments();
    if (convCount === 0) {
      console.log("[DB Seed] Creating default starter channels & AI Bot room...");
      const allUserIds = seedUsers.map((u) => u._id);
      const adminId = seedUsers[0] ? seedUsers[0]._id : null;

      const c1 = await Conversation.create({
        type: "group",
        slug: "general",
        participants: allUserIds,
        admins: [adminId],
        createdBy: adminId,
        groupMeta: {
          name: "General Lounge",
          description: "Global community chat for everyone",
          avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
        },
      });

      const c2 = await Conversation.create({
        type: "group",
        slug: "webdev",
        participants: allUserIds,
        admins: [adminId],
        createdBy: adminId,
        groupMeta: {
          name: "Web Dev 3 Study Group",
          description: "Discuss assignments, WebSockets, Express & Mongoose",
          avatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=120&h=120&q=80",
        },
      });

      const c3 = await Conversation.create({
        type: "group",
        slug: "devteam",
        participants: allUserIds,
        admins: [adminId],
        createdBy: adminId,
        groupMeta: {
          name: "Engineering Core",
          description: "Production releases, architecture & reviews",
          avatar: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=120&h=120&q=80",
        },
      });

      const c4 = await Conversation.create({
        type: "direct",
        slug: "meta-ai",
        participants: allUserIds,
        admins: [adminId],
        createdBy: adminId,
        groupMeta: {
          name: "Meta AI",
          description: "Ask anything, summarize chats, or generate smart answers",
          avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
        },
      });

      const aarav = seedUsers.find((u) => u.username === "aarav") || seedUsers[1] || seedUsers[0];
      const priya = seedUsers.find((u) => u.username === "priya") || seedUsers[2] || seedUsers[0];

      await Message.create([
        {
          conversationId: c1._id,
          roomId: "general",
          sender: {
            id: aarav._id.toString(),
            userId: aarav._id,
            username: aarav.displayName || aarav.username,
            avatar: aarav.avatar,
          },
          text: "Hey everyone! Welcome to the new WhatsApp Web portal.",
          status: "read",
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
        {
          conversationId: c1._id,
          roomId: "general",
          sender: {
            id: priya._id.toString(),
            userId: priya._id,
            username: priya.displayName || priya.username,
            avatar: priya.avatar,
          },
          text: "The Socket.IO real-time connection is ultra fast! Dual checkmarks work smoothly too.",
          status: "read",
          createdAt: new Date(Date.now() - 3600000 * 1.5),
        },
        {
          conversationId: c2._id,
          roomId: "webdev",
          sender: {
            id: aarav._id.toString(),
            userId: aarav._id,
            username: aarav.displayName || aarav.username,
            avatar: aarav.avatar,
          },
          text: "Have you tested the typing indicators and emoji tray yet?",
          status: "read",
          createdAt: new Date(Date.now() - 1800000),
        },
        {
          conversationId: c4._id,
          roomId: "meta-ai",
          sender: {
            id: "bot_meta_ai",
            username: "Meta AI",
            avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
            isAI: true,
          },
          text: "Welcome to WhatsApp with Meta AI! Ask me to explain concepts, summarize chats, or answer any question with RAG context.",
          status: "read",
          createdAt: new Date(Date.now() - 600000),
        },
      ]);

      await Conversation.updateOne(
        { _id: c1._id },
        {
          lastMessage: {
            text: "The Socket.IO real-time connection is ultra fast! Dual checkmarks work smoothly too.",
            senderId: priya._id,
            senderName: priya.displayName,
            timestamp: new Date(Date.now() - 3600000 * 1.5),
            status: "read",
          },
        }
      );

      await Conversation.updateOne(
        { _id: c4._id },
        {
          lastMessage: {
            text: "Welcome to WhatsApp with Meta AI! Ask me anything.",
            senderId: null,
            senderName: "Meta AI",
            timestamp: new Date(Date.now() - 600000),
            status: "read",
          },
        }
      );

      console.log("[DB Seed] Seeded default channels, messages, and Meta AI assistant.");
    }
  } catch (err) {
    console.error("[DB Seed] Error seeding database:", err);
  }
}

async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    const User = require("../models/User");
    const Conversation = require("../models/Conversation");
    const Message = require("../models/Message");

    await seedDatabase(User, Conversation, Message);

    return conn;
  } catch (error) {
    console.error("[MongoDB] Connection error:", error.message);
    setTimeout(connectDB, 2000);
  }
}

module.exports = connectDB;
