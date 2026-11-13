import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { ServiceWorker } from "@/components/service-worker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#001e40" },
    { media: "(prefers-color-scheme: dark)", color: "#021021" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.url),
  title: { default: APP_CONFIG.meta.title, template: `%s | ${APP_CONFIG.name}` },
  description: APP_CONFIG.meta.description,
  applicationName: APP_CONFIG.name,
  keywords: [
    "university maintenance",
    "campus facilities",
    "service requests",
    "work orders",
    "hostel maintenance",
    "fault reporting",
    "SLA tracking",
    "QR code reporting",
  ],
  authors: [{ name: APP_CONFIG.name }],
  creator: APP_CONFIG.name,
  category: "productivity",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: APP_CONFIG.name, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: APP_CONFIG.name,
    locale: "en_GB",
    url: "/",
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang="en-GB"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript />
      </head>
      <body className={`${fontVars} min-h-screen antialiased`}>
        <TooltipProvider>
          <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
            <Providers>{children}</Providers>
            <Toaster />
            <ServiceWorker />
          </PreferencesStoreProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
