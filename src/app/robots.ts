import type { MetadataRoute } from "next";

import { appUrl } from "@/config/app-url";

/** Public marketing and sign-in pages are indexable; the app, API, print views and QR links are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/login", "/auth/register", "/privacy"],
        disallow: ["/dashboard", "/api/", "/print/", "/r/"],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
