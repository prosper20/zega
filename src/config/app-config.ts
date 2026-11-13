import packageJson from "../../package.json";
import { appUrl } from "./app-url";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "ZEGA",
  tagline: "Report it. Track it. Resolve it.",
  url: appUrl(),
  version: packageJson.version,
  copyright: `© ${currentYear}, ZEGA.`,
  meta: {
    title: "ZEGA: University Services & Maintenance",
    description:
      "Report it. Track it. Resolve it. ZEGA lets students and staff report campus faults, maintenance officers resolve them and administrators keep every request accountable.",
  },
};
