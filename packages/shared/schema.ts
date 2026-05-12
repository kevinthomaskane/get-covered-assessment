import { z } from "zod";

export const authTypeSchema = z.enum([
  "password",
  "magic-link",
  "sso",
  "oauth",
  "multi-step",
  "unknown",
]);
export type AuthType = z.infer<typeof authTypeSchema>;

export const detectionResultSchema = z.object({
  snippet: z
    .string()
    .nullable()
    .refine((v) => v === null || (v.includes("<") && v.includes(">")), {
      message: "snippet must look like HTML when non-null",
    }),
  authType: authTypeSchema,
  notes: z.string(),
});
export type DetectionResult = z.infer<typeof detectionResultSchema>;

export const jobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const submitUrlSchema = z.object({
  url: z
    .url()
    .refine((u) => {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return false;
        }
        const host = parsed.hostname.toLowerCase();
        if (
          host === "localhost" ||
          host === "0.0.0.0" ||
          host.startsWith("127.") ||
          host.startsWith("169.254.") ||
          host.startsWith("10.") ||
          host.startsWith("192.168.")
        ) {
          return false;
        }
        const m = host.match(/^172\.(\d+)\./);
        if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
        return true;
      } catch {
        return false;
      }
    }, { message: "URL must be a public http(s) address" }),
});
