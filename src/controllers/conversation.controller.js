const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const { apiSuccess, apiError } = require("../utils/response");

/**
 * Get all conversations for current user or default channels
 */
async function getConversations(req, res, next) {
  try {
    let filter = {};

    if (req.user) {
      filter = {
        $or: [{ participants: req.user._id }, { slug: { $exists: true } }],
      };
    } else {
      filter = { slug: { $exists: true } };
    }

    const conversations = await Conversation.find(filter)
      .populate("participants", "-passwordHash")
      .populate("admins", "-passwordHash")
      .sort({ updatedAt: -1 });

    const formatted = conversations.map((conv) => {
      const isGroup = conv.type === "group";
      const isSystemChannel = Boolean(conv.slug);
      let name = conv.groupMeta?.name || "Chat";
      let avatar = conv.groupMeta?.avatar || "";
      let description = conv.groupMeta?.description || "";
      let otherUser = null;

      // Only override name/avatar from participant if it's a real direct 1-on-1 private chat (not a system channel like meta-ai)
      if (!isGroup && !isSystemChannel && req.user && conv.participants.length > 0) {
        const other = conv.participants.find((p) => p._id.toString() !== req.user._id.toString());
        if (other) {
          otherUser = other;
          name = other.displayName || other.username;
          avatar = other.avatar;
          description = other.about;
        }
      }

      const isPinned = req.user
        ? req.user.pinnedConversations?.some((p) => p.toString() === conv._id.toString())
        : false;
      const isMuted = req.user
        ? req.user.mutedConversations?.some((m) => m.toString() === conv._id.toString())
        : false;

      return {
        id: conv.slug || conv._id.toString(),
        _id: conv._id,
        slug: conv.slug,
        type: conv.type,
        name: name || conv.slug || "Conversation",
        avatar:
          avatar ||
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&h=120&q=80",
        description: description || "",
        phone: otherUser ? otherUser.phone : "",
        otherUser: otherUser ? {
          id: otherUser._id,
          username: otherUser.username,
          displayName: otherUser.displayName,
          phone: otherUser.phone,
          avatar: otherUser.avatar,
          about: otherUser.about,
        } : null,
        participants: conv.participants,
        admins: conv.admins,
        lastMessage: conv.lastMessage,
        unreadCount: req.user ? conv.unreadCounts?.get(req.user._id.toString()) || 0 : 0,
        isPinned,
        isMuted,
        updatedAt: conv.updatedAt,
      };
    });

    return apiSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single conversation by ID or slug
 */
async function getConversationById(req, res, next) {
  try {
    const { id } = req.params;
    let conv = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(id)
        .populate("participants", "-passwordHash")
        .populate("admins", "-passwordHash");
    } else {
      conv = await Conversation.findOne({ slug: id })
        .populate("participants", "-passwordHash")
        .populate("admins", "-passwordHash");
    }

    if (!conv) {
      return apiError(res, "Conversation not found", 404);
    }

    if (!conv.slug) {
      if (!req.user) {
        return apiError(res, "Authentication required to view this conversation", 401);
      }
      const isMember = conv.participants.some(
        (p) => (p._id || p).toString() === req.user._id.toString()
      );
      if (!isMember) {
        return apiError(res, "You are not authorized to view this conversation", 403);
      }
    }

    return apiSuccess(res, conv);
  } catch (err) {
    next(err);
  }
}

/**
 * Create or get direct (1-on-1) conversation
 */
async function createDirectChat(req, res, next) {
  try {
    const targetUserId = req.body.targetUserId || req.body.recipientId || req.body.userId;
    if (!targetUserId) {
      return apiError(res, "Target user ID is required", 400);
    }

    if (targetUserId === req.user._id.toString()) {
      return apiError(res, "Cannot create direct chat with yourself", 400);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return apiError(res, "Target user does not exist", 404);
    }

    // Check blocking relations
    const meBlockedByTarget = targetUser.blockedUsers && targetUser.blockedUsers.some(
      (b) => b.toString() === req.user._id.toString()
    );
    const targetBlockedByMe = req.user.blockedUsers && req.user.blockedUsers.some(
      (b) => b.toString() === targetUser._id.toString()
    );
    if (meBlockedByTarget || targetBlockedByMe) {
      return apiError(res, "Cannot start conversation: one of the users has blocked the other", 403);
    }

    let conv = await Conversation.findOne({
      type: "direct",
      participants: { $all: [req.user._id, targetUser._id], $size: 2 },
    })
      .populate("participants", "-passwordHash")
      .populate("admins", "-passwordHash");

    if (!conv) {
      conv = await Conversation.create({
        type: "direct",
        participants: [req.user._id, targetUser._id],
        createdBy: req.user._id,
      });

      conv = await Conversation.findById(conv._id)
        .populate("participants", "-passwordHash")
        .populate("admins", "-passwordHash");
    }

    return apiSuccess(res, conv, "Direct conversation ready", 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new group chat
 */
async function createGroupChat(req, res, next) {
  try {
    const { name, description, avatar, participantIds = [] } = req.body;

    if (!name || !name.trim()) {
      return apiError(res, "Group name is required", 400);
    }

    const uniqueParticipants = Array.from(
      new Set([req.user._id.toString(), ...participantIds])
    );

    const group = await Conversation.create({
      type: "group",
      participants: uniqueParticipants,
      admins: [req.user._id],
      createdBy: req.user._id,
      groupMeta: {
        name: name.trim(),
        description: description ? description.trim() : "",
        avatar:
          avatar ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      },
      lastMessage: {
        text: `Group "${name.trim()}" created by ${req.user.displayName || req.user.username}`,
        senderId: req.user._id,
        senderName: req.user.displayName || req.user.username,
        timestamp: new Date(),
      },
    });

    const populated = await Conversation.findById(group._id)
      .populate("participants", "-passwordHash")
      .populate("admins", "-passwordHash");

    return apiSuccess(res, populated, "Group created successfully", 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Update group metadata (name, description, avatar) - Admin only
 */
async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, avatar } = req.body;

    const group = await Conversation.findById(id);
    if (!group || group.type !== "group") {
      return apiError(res, "Group not found", 404);
    }

    const isMember = group.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return apiError(res, "You are not a member of this group", 400);
    }

    const isAdmin = group.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return apiError(res, "Only group administrators can modify group settings", 403);
    }

    if (name) group.groupMeta.name = name.trim();
    if (description !== undefined) group.groupMeta.description = description.trim();
    if (avatar) group.groupMeta.avatar = avatar;

    await group.save();
    return apiSuccess(res, group, "Group updated successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Add members to group - Admin only
 */
async function addGroupMembers(req, res, next) {
  try {
    const { id } = req.params;
    const { userIds, userId } = req.body;
    const ids = Array.isArray(userIds) ? userIds : userId ? [userId] : [];

    if (ids.length === 0) {
      return apiError(res, "userIds array or userId is required", 400);
    }

    const group = await Conversation.findById(id);
    if (!group || group.type !== "group") {
      return apiError(res, "Group not found", 404);
    }

    const isMember = group.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return apiError(res, "You are not a member of this group", 400);
    }

    const isAdmin = group.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return apiError(res, "Only group administrators can add participants", 403);
    }

    ids.forEach((uId) => {
      if (!group.participants.some((p) => p.toString() === uId.toString())) {
        group.participants.push(uId);
      }
    });

    await group.save();
    const updated = await Conversation.findById(id).populate("participants", "-passwordHash");
    return apiSuccess(res, updated, "Members added successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Remove member from group - Admin only
 */
async function removeGroupMember(req, res, next) {
  try {
    const { id, targetUserId } = req.params;

    const group = await Conversation.findById(id);
    if (!group || group.type !== "group") {
      return apiError(res, "Group not found", 404);
    }

    const isMember = group.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return apiError(res, "You are not a member of this group", 400);
    }

    const isAdmin = group.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return apiError(res, "Only group administrators can remove participants", 403);
    }

    group.participants = group.participants.filter(
      (p) => p.toString() !== targetUserId.toString()
    );
    group.admins = group.admins.filter((a) => a.toString() !== targetUserId.toString());

    await group.save();
    return apiSuccess(res, group, "Member removed from group");
  } catch (err) {
    next(err);
  }
}

/**
 * Leave group
 */
async function leaveGroup(req, res, next) {
  try {
    const { id } = req.params;

    const group = await Conversation.findById(id);
    if (!group || group.type !== "group") {
      return apiError(res, "Group not found", 404);
    }

    const isMember = group.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return apiError(res, "You are not a member of this group", 400);
    }

    group.participants = group.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== req.user._id.toString()
    );

    if (group.admins.length === 0 && group.participants.length > 0) {
      group.admins.push(group.participants[0]);
    }

    await group.save();
    return apiSuccess(res, null, "You have left the group");
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle pin conversation
 */
async function pinConversation(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const isPinned = user.pinnedConversations.some((p) => p.toString() === id.toString());
    if (isPinned) {
      user.pinnedConversations = user.pinnedConversations.filter(
        (p) => p.toString() !== id.toString()
      );
    } else {
      user.pinnedConversations.push(id);
    }

    await user.save();
    return apiSuccess(res, { pinned: !isPinned }, !isPinned ? "Pinned" : "Unpinned");
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle mute conversation
 */
async function muteConversation(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const isMuted = user.mutedConversations.some((m) => m.toString() === id.toString());
    if (isMuted) {
      user.mutedConversations = user.mutedConversations.filter(
        (m) => m.toString() !== id.toString()
      );
    } else {
      user.mutedConversations.push(id);
    }

    await user.save();
    return apiSuccess(res, { muted: !isMuted }, !isMuted ? "Muted" : "Unmuted");
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle archive conversation
 */
async function archiveConversation(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const isArchived = user.archivedConversations?.some((a) => a.toString() === id.toString());
    if (isArchived) {
      user.archivedConversations = user.archivedConversations.filter(
        (a) => a.toString() !== id.toString()
      );
    } else {
      if (!user.archivedConversations) user.archivedConversations = [];
      user.archivedConversations.push(id);
    }

    await user.save();
    return apiSuccess(res, { archived: !isArchived }, !isArchived ? "Archived" : "Unarchived");
  } catch (err) {
    next(err);
  }
}

/**
 * Clear chat messages for current user
 */
async function clearChat(req, res, next) {
  try {
    const { id } = req.params;
    let conv = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(id);
    } else {
      conv = await Conversation.findOne({ slug: id });
    }

    const query = conv ? { conversationId: conv._id } : { roomId: id };
    await Message.updateMany(query, {
      $addToSet: { deletedFor: req.user._id },
    });

    return apiSuccess(res, null, "Chat cleared successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * Delete conversation
 */
async function deleteConversation(req, res, next) {
  try {
    const { id } = req.params;
    const conv = await Conversation.findById(id);
    if (!conv) {
      return apiError(res, "Conversation not found", 404);
    }

    if (conv.type === "group") {
      const isAdmin = conv.admins.some((a) => a.toString() === req.user._id.toString());
      if (isAdmin) {
        await Message.deleteMany({ conversationId: conv._id });
        await Conversation.findByIdAndDelete(id);
        return apiSuccess(res, null, "Group conversation permanently deleted");
      } else {
        conv.participants = conv.participants.filter(
          (p) => p.toString() !== req.user._id.toString()
        );
        await conv.save();
        return apiSuccess(res, null, "Left group conversation");
      }
    } else {
      conv.participants = conv.participants.filter(
        (p) => p.toString() !== req.user._id.toString()
      );
      if (conv.participants.length === 0) {
        await Message.deleteMany({ conversationId: conv._id });
        await Conversation.findByIdAndDelete(id);
      } else {
        await conv.save();
      }
      return apiSuccess(res, null, "Conversation deleted");
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Get or generate group invitation link
 */
async function getGroupInviteLink(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Conversation.findById(id);
    if (!group || group.type !== "group") {
      return apiError(res, "Group not found", 404);
    }

    const isMember = group.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return apiError(res, "You are not a member of this group", 403);
    }

    if (!group.inviteCode) {
      const crypto = require("crypto");
      group.inviteCode = crypto.randomBytes(6).toString("hex");
      await group.save();
    }

    return apiSuccess(
      res,
      {
        inviteCode: group.inviteCode,
        inviteUrl: `/join/${group.inviteCode}`,
      },
      "Invite link retrieved"
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Join group using invite code
 */
async function joinGroupByInvite(req, res, next) {
  try {
    const { inviteCode } = req.params;
    const group = await Conversation.findOne({ inviteCode, type: "group" });
    if (!group) {
      return apiError(res, "Invalid or expired invite link", 404);
    }

    const isMember = group.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (isMember) {
      return apiSuccess(res, group, "Already a member of this group");
    }

    group.participants.push(req.user._id);
    await group.save();

    const populated = await Conversation.findById(group._id)
      .populate("participants", "-passwordHash")
      .populate("admins", "-passwordHash");

    return apiSuccess(res, populated, "Joined group successfully", 200);
  } catch (err) {
    next(err);
  }
}

/**
 * Get media and document attachments in conversation
 */
async function getConversationMedia(req, res, next) {
  try {
    const { id } = req.params;
    let conv = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(id);
    } else {
      conv = await Conversation.findOne({ slug: id });
    }

    const query = conv ? { conversationId: conv._id } : { roomId: id };
    query.mediaUrl = { $ne: null };
    query.isDeletedForEveryone = false;

    if (req.user) {
      query.deletedFor = { $ne: req.user._id };
    }

    const media = await Message.find(query)
      .select("text mediaType mediaUrl mediaName mediaSize sender createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess(res, media);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversations,
  getConversationById,
  createDirectChat,
  createGroupChat,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  pinConversation,
  muteConversation,
  archiveConversation,
  clearChat,
  deleteConversation,
  getGroupInviteLink,
  joinGroupByInvite,
  getConversationMedia,
};
