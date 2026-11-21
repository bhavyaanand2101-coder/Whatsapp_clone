const { z } = require("zod");

const createGroupSchema = z.object({
  name: z
    .string({ required_error: "Group name is required" })
    .min(1, "Group name cannot be empty")
    .max(100, "Group name cannot exceed 100 characters"),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
});

const addMembersSchema = z.object({
  userIds: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
};
