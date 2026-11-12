/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  agentRules: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
