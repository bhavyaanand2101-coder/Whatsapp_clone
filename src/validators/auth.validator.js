const { z } = require("zod");

const registerSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, and dashes"),
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters long"),
  displayName: z.string().max(50).optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  about: z.string().max(140).optional(),
});

const loginSchema = z.object({
  identifier: z.string({ required_error: "Username or email is required" }),
  password: z.string({ required_error: "Password is required" }),
});

const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  about: z.string().max(140).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
};
