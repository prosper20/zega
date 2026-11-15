import net from "node:net";

// Node gives each address 250ms by default, which is too short on slow links.
export function relaxConnectTimeout() {
  if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === "function") {
    net.setDefaultAutoSelectFamilyAttemptTimeout(5000);
  }
}
