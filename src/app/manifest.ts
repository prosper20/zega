import type { MetadataRoute } from "next";

import { APP_CONFIG } from "@/config/app-config";

/** Installable app (Add to Home Screen), mainly for officers moving around campus. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_CONFIG.name}: University Services & Maintenance`,
    short_name: APP_CONFIG.name,
    description: APP_CONFIG.tagline,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f9fd",
    theme_color: "#001e40",
    categories: ["productivity", "utilities", "education"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Report an issue", url: "/dashboard/requests/new" },
      { name: "My work orders", url: "/dashboard/work" },
    ],
  };
}
