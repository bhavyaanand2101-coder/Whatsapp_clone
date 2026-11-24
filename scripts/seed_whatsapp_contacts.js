const mongoose = require("mongoose");
const env = require("../src/config/env");
const { hashPassword } = require("../src/utils/cryptoAuth");
const User = require("../src/models/User");
const Conversation = require("../src/models/Conversation");
const Message = require("../src/models/Message");

async function seedRichWhatsApp() {
  await mongoose.connect(env.MONGO_URI);
  console.log("Connected to MongoDB for rich WhatsApp seeding...");

  const commonPasswordHash = hashPassword("Password123!");

  const usersData = [
    {
      username: "bhavya",
      displayName: "Bhavya",
      email: "bhavya@whatsapp.local",
      phone: "+91 87999 99999",
      about: "Coding WebSockets in Sem 3",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "amancr",
      displayName: "Aman Cr",
      email: "aman@whatsapp.local",
      phone: "+91 98765 43210",
      about: "CR - B.Tech CSE (AI-ML) Section E",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "bhavya_airtel",
      displayName: "Bhavya Airtel",
      email: "bhavya.airtel@whatsapp.local",
      phone: "+91 98111 22233",
      about: "Available on Airtel 5G",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "priyanshu",
      displayName: "Priyanshu Pandey K",
      email: "priyanshu@whatsapp.local",
      phone: "+91 98234 56789",
      about: "Web Dev 3 project lead • Flow",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "sashi",
      displayName: "Sashi Bhai K",
      email: "sashi@whatsapp.local",
      phone: "+91 97123 45678",
      about: "D block",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "lovesir",
      displayName: "Love Sir Web Dev",
      email: "lovesir@whatsapp.local",
      phone: "+91 99887 76655",
      about: "Faculty Web Dev-III | Assignment reviews on Wednesdays",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "customtshirt",
      displayName: "Custom t shirt",
      email: "merch@whatsapp.local",
      phone: "+91 91234 56780",
      about: "College hoodies, t-shirts & custom merch orders",
      avatar: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "priya",
      displayName: "Priya Nair",
      email: "priya@whatsapp.local",
      phone: "+91 98303 45678",
      about: "Reviewing assignment pull requests",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "rohan",
      displayName: "Rohan Verma",
      email: "rohan@whatsapp.local",
      phone: "+91 98101 23456",
      about: "Available for code review",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "aarav",
      displayName: "Aarav Sharma",
      email: "aarav@whatsapp.local",
      phone: "+91 98202 34567",
      about: "MERN Stack Faculty",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80",
    },
    {
      username: "meta_ai",
      displayName: "Meta AI",
      email: "ai@meta.whatsapp.local",
      phone: "+1 800 555 0199",
      about: "Always here to help with answers, summaries & ideas",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
      isAI: true,
    },
  ];

  const userMap = {};
  for (const u of usersData) {
    let existing = await User.findOne({ username: u.username });
    if (!existing) {
      existing = await User.create({
        ...u,
        passwordHash: commonPasswordHash,
        online: true,
      });
      console.log(`Created user: ${u.displayName} (${u.phone})`);
    } else {
      existing.phone = u.phone;
      existing.displayName = u.displayName;
      existing.about = u.about;
      existing.avatar = u.avatar;
      await existing.save();
      console.log(`Updated user: ${u.displayName} (${u.phone})`);
    }
    userMap[u.username] = existing;
  }

  const allUserIds = Object.values(userMap).map((u) => u._id);
  const bhavya = userMap["bhavya"];

  // Seed / Update Groups matching Real WhatsApp
  const groupsData = [
    {
      slug: "btech-aiml-e",
      name: "Btech CSE (AI-ML) Sec E",
      description: "Web Dev-III B.tech AIML Sec- E, Design and Development",
      avatar: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Web Dev-III B.tech AIML Sec- E, Design and Development",
      lastSender: "Aman Cr",
    },
    {
      slug: "krmu-official",
      name: "KRMU Student Official Communication",
      description: "Announcements ▶ IMPORTANT NOTICE for Semester 3 Exams & Assignments",
      avatar: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Announcements ▶ IMPORTANT NOTICE: Project submission deadline is Friday",
      lastSender: "Love Sir Web Dev",
    },
    {
      slug: "alsi-log",
      name: "Alsi Log",
      description: "College friends squad & project chill lounge",
      avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Priyanshu Pandey: webdev project.zip",
      lastSender: "Priyanshu Pandey K",
    },
    {
      slug: "general",
      name: "General Lounge",
      description: "Global community chat for everyone",
      avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Hello safe text",
      lastSender: "Bhavya",
    },
    {
      slug: "webdev",
      name: "Web Dev 3 Study Group",
      description: "Discuss assignments, WebSockets, Express & Mongoose",
      avatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Testing real-time message delivery & persistence ✓✓",
      lastSender: "Aarav Sharma",
    },
    {
      slug: "devteam",
      name: "Engineering Core",
      description: "Production releases, architecture & reviews",
      avatar: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Production releases, architecture & reviews",
      lastSender: "Priya Nair",
    },
    {
      slug: "meta-ai",
      name: "Meta AI",
      description: "Ask anything, summarize chats, or generate smart answers",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80",
      lastMsgText: "Ask anything, summarize chats, or generate smart answers",
      lastSender: "Meta AI",
    },
  ];

  for (const g of groupsData) {
    let conv = await Conversation.findOne({ slug: g.slug });
    if (!conv) {
      conv = await Conversation.create({
        type: g.slug === "meta-ai" ? "direct" : "group",
        slug: g.slug,
        participants: allUserIds,
        admins: [bhavya._id],
        createdBy: bhavya._id,
        groupMeta: {
          name: g.name,
          description: g.description,
          avatar: g.avatar,
        },
        lastMessage: {
          text: g.lastMsgText,
          senderName: g.lastSender,
          timestamp: new Date(),
          status: "read",
        },
      });
      console.log(`Created group channel: ${g.name}`);
    } else {
      conv.groupMeta = {
        name: g.name,
        description: g.description,
        avatar: g.avatar,
      };
      conv.participants = Array.from(new Set([...conv.participants, ...allUserIds]));
      await conv.save();
      console.log(`Updated group channel: ${g.name}`);
    }
  }

  // Seed / Update Direct 1-on-1 Chats between Bhavya and friends
  const directChats = [
    { target: "bhavya_airtel", lastText: "Hello safe text", time: "12:54 PM" },
    { target: "amancr", lastText: "Ok", time: "12:57 PM" },
    { target: "customtshirt", lastText: "ok sir", time: "11:24 AM" },
    { target: "priyanshu", lastText: "Flow", time: "11:13 AM" },
    { target: "sashi", lastText: "D block", time: "10:46 AM" },
    { target: "lovesir", lastText: 'You reacted ❤️ to "Thank you 😊"', time: "10:39 AM" },
    { target: "priya", lastText: "Reviewing assignment pull requests", time: "09:30 AM" },
    { target: "rohan", lastText: "Available for code review", time: "Yesterday" },
  ];

  for (const d of directChats) {
    const targetUser = userMap[d.target];
    if (!targetUser) continue;

    let conv = await Conversation.findOne({
      type: "direct",
      slug: null,
      participants: { $all: [bhavya._id, targetUser._id] },
    });

    if (!conv) {
      conv = await Conversation.create({
        type: "direct",
        participants: [bhavya._id, targetUser._id],
        admins: [bhavya._id],
        createdBy: bhavya._id,
        lastMessage: {
          text: d.lastText,
          senderId: targetUser._id,
          senderName: targetUser.displayName,
          timestamp: new Date(),
          status: "read",
        },
      });
      console.log(`Created direct conversation: Bhavya <-> ${targetUser.displayName}`);
    } else {
      conv.lastMessage = {
        text: d.lastText,
        senderId: targetUser._id,
        senderName: targetUser.displayName,
        timestamp: new Date(),
        status: "read",
      };
      await conv.save();
      console.log(`Updated direct conversation: Bhavya <-> ${targetUser.displayName}`);
    }

    // Add initial message so conversation has message history
    const existingMsg = await Message.findOne({ conversationId: conv._id });
    if (!existingMsg) {
      await Message.create({
        conversationId: conv._id,
        sender: {
          id: targetUser._id.toString(),
          userId: targetUser._id,
          username: targetUser.displayName,
          phone: targetUser.phone,
          avatar: targetUser.avatar,
        },
        text: d.lastText,
        status: "read",
        createdAt: new Date(),
      });
    }
  }

  console.log("Rich WhatsApp contacts and groups seeded successfully!");
  process.exit(0);
}

seedRichWhatsApp().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
