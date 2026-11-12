import net from "node:net";

/**
 * Node's "happy eyeballs" gives each resolved address only 250ms before trying the next.
 * On slow links (WSL, mobile hotspots) that makes every Neon address time out, so allow longer.
 */
export function relaxConnectTimeout() {
  if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === "function") {
    net.setDefaultAutoSelectFamilyAttemptTimeout(5000);
  }
}
