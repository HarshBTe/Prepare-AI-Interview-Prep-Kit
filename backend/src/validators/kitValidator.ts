import { z } from "zod";

export const generateKitRequestSchema = z.object({
  jd: z
    .string()
    .trim()
    .min(1, "Job description is required"),

  company_url: z
    .string()
    .trim()
    .url("A valid company URL is required"),

  days: z
    .number()
    .int("days must be an integer")
    .min(1, "days must be at least 1")
    .max(60, "days cannot exceed 60"),

  role: z
    .string()
    .trim()
    .optional(),

  location: z
    .string()
    .trim()
    .optional(),
});

export type GenerateKitRequest = z.infer<
  typeof generateKitRequestSchema
>;