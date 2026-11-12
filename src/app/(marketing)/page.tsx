import { CtaBand } from "./_components/cta-band";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { Impact } from "./_components/impact";
import { Roles } from "./_components/roles";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen">
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
