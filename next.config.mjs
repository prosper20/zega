import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  agentRules: false,
  // Pin the workspace root: a stray lockfile in the home folder must not widen what Turbopack watches.
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
