import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** Validated environment. Import `env` instead of reading process.env directly. */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("ZEGA <onboarding@resend.dev>"),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    CRON_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
});
