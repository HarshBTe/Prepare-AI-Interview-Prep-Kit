import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("A valid email is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("A valid email is required"),

  password: z
    .string()
    .min(1, "Password is required"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;