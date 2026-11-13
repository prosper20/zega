import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== "production";

/** Joins CSP directives; `null` entries are skipped. */
const csp = (directives) =>
  Object.entries(directives)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => (v === "" ? k : `${k} ${v}`))
    .join("; ");

const BLOB = "https://*.public.blob.vercel-storage.com";

/**
 * App-wide Content Security Policy. Inline scripts are needed for Next's bootstrap and the
 * pre-paint theme script (no nonce, so pages stay statically renderable); dev adds eval and
 * websockets for Fast Refresh. Uploaded photos come from Vercel Blob.
 */
const APP_CSP = csp({
  "default-src": "'self'",
  "script-src": `'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src": "'self' 'unsafe-inline'",
  "img-src": `'self' data: blob: ${BLOB}`,
  "media-src": `'self' blob: ${BLOB}`,
  "font-src": "'self' data:",
  "connect-src": `'self'${dev ? " ws: wss:" : ""}`,
  "worker-src": "'self'",
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
  "upgrade-insecure-requests": dev ? null : "",
});

/** The API reference pages load Scalar and Swagger UI from jsDelivr, so they get their own policy. */
const DOCS_CSP = csp({
  "default-src": "'self'",
  "script-src": "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src": "'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.scalar.com",
  "img-src": "'self' data: https:",
  "font-src": "'self' data: https:",
  "connect-src": "'self' https:",
  "object-src": "'none'",
  "base-uri": "'self'",
  "frame-ancestors": "'none'",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  agentRules: false,
  // Pin the workspace root: a stray lockfile in the home folder must not widen what Turbopack watches.
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  // Server-only PDF renderer: load from node_modules instead of bundling.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Fonts read from disk by the Open Graph image routes.
  outputFileTracingIncludes: { "/**/*": ["./src/lib/og-fonts/**"] },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      { source: "/((?!api/docs).*)", headers: [{ key: "Content-Security-Policy", value: APP_CSP }] },
      { source: "/api/docs/:path*", headers: [{ key: "Content-Security-Policy", value: DOCS_CSP }] },
      { source: "/api/docs", headers: [{ key: "Content-Security-Policy", value: DOCS_CSP }] },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  compiler: {
    // Strip stray client logs in production; the server's structured logger writes through info/warn/error.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn", "info"] } : false,
  },
};

export default nextConfig;
