/** Turns a user-agent string into a short "Chrome on Windows" label. */
export function describeUserAgent(ua: string | null | undefined): { browser: string; os: string; mobile: boolean } {
  if (!ua) return { browser: "Unknown browser", os: "unknown device", mobile: false };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : /node|undici|curl|Postman/i.test(ua)
              ? "API client"
              : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "unknown device";
  return { browser, os, mobile: /Mobile|Android|iPhone/.test(ua) };
}

/** Shows loopback and private addresses as "Local network" instead of raw IPv6 zeros. */
export function formatIp(ip: string | null | undefined) {
  if (!ip) return "Unknown IP";
  const v = ip.replace(/^::ffff:/, "");
  if (/^(0{1,4}:){7}0{0,3}[01]?$|^::1?$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(v))
    return "Local network";
  return v;
}
