import Link from "next/link";

import { ZegaWordmark } from "@/components/app-logo";
import { APP_CONFIG } from "@/config/app-config";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <ZegaWordmark compact className="text-foreground h-5 w-auto" />
          <span>· {APP_CONFIG.tagline}</span>
        </div>
        <nav className="flex gap-5">
          <Link href="/auth/login" className="hover:text-foreground">
            Log in
          </Link>
          <Link href="/auth/register" className="hover:text-foreground">
            Register
          </Link>
          <a href="/api/docs" className="hover:text-foreground">
            API docs
          </a>
        </nav>
        <p>{APP_CONFIG.copyright}</p>
      </div>
    </footer>
  );
}
