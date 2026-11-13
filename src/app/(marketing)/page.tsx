import { APP_CONFIG } from "@/config/app-config";

import { CtaBand } from "./_components/cta-band";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { Impact } from "./_components/impact";
import { Roles } from "./_components/roles";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: APP_CONFIG.name,
      url: APP_CONFIG.url,
      description: APP_CONFIG.meta.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      inLanguage: "en-GB",
      offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
      featureList: [
        "QR code fault reporting",
        "Live request tracking",
        "Service level targets with escalation",
        "Officer work-order board",
        "Tamper-evident audit trail",
        "PDF and CSV reports",
      ],
    },
    { "@type": "Organization", name: APP_CONFIG.name, url: APP_CONFIG.url, logo: `${APP_CONFIG.url}/icon/512` },
  ],
};

export const metadata = { alternates: { canonical: "/" } };

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static structured data; "<" is escaped
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <Roles />
        <Impact />
        <Features />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
