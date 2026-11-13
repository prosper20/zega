/**
 * The public base URL of this deployment, resolved without code changes on Vercel:
 * explicit NEXT_PUBLIC_APP_URL, else Vercel's production domain, else the per-deployment URL.
 */
export function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Origins allowed to call the auth endpoints (production domain plus this preview deployment). */
export function trustedOrigins() {
  return [
    appUrl(),
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ].filter((o): o is string => Boolean(o));
}
