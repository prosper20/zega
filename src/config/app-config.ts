import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "ZEGA",
  nameGeez: "ዘገባ",
  tagline: "Report it. Track it. Resolve it.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  version: packageJson.version,
  copyright: `© ${currentYear}, ZEGA.`,
  meta: {
    title: "ZEGA — University Services & Maintenance",
    description:
      "Report it. Track it. Resolve it. ZEGA (inspired by the Amharic ዘገባ, “report”) lets students and staff report faults, officers resolve them and administrators keep every request accountable.",
  },
};
