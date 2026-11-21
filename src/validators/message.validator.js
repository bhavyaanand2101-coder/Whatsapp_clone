const { z } = require("zod");

const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  roomId: z.string().optional(),
  text: z.string().optional(),
  mediaType: z.enum(["text", "image", "video", "audio", "voice", "document", "file"]).default("text"),
  mediaUrl: z.string().nullable().optional(),
  mediaName: z.string().nullable().optional(),
  mediaSize: z.number().nullable().optional(),
  replyTo: z
    .object({
      messageId: z.string().optional(),
      text: z.string().optional(),
      senderName: z.string().optional(),
    })
    .optional(),
  sender: z
    .object({
      id: z.string().optional(),
      username: z.string().optional(),
      avatar: z.string().optional(),
      isAI: z.boolean().optional(),
    })
    .optional(),
});

const reactMessageSchema = z.object({
  emoji: z.string({ required_error: "Emoji reaction is required" }).min(1),
});

module.exports = {
  sendMessageSchema,
  reactMessageSchema,
};
