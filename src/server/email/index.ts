import type { ReactElement } from "react";

import { render } from "@react-email/components";

/**
 * Sends a transactional email through Resend when RESEND_API_KEY is set; otherwise logs it
 * (development and tests), so the rest of the app behaves identically without email credentials.
 */
export async function sendEmail(msg: { to: string; subject: string; react: ReactElement }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ZEGA <onboarding@resend.dev>";
  if (!key) {
    if (process.env.NODE_ENV !== "test" && !process.env.VITEST)
      console.info(`[email:dev] to=${msg.to} subject="${msg.subject}"`);
    return { id: "dev", skipped: true };
  }
  const [html, text] = await Promise.all([render(msg.react), render(msg.react, { plainText: true })]);
  const { Resend } = await import("resend");
  const { data, error } = await new Resend(key).emails.send({ from, to: msg.to, subject: msg.subject, html, text });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { id: data?.id ?? "", skipped: false };
}
