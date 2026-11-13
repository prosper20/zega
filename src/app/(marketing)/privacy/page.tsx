import Link from "next/link";

import type { Metadata } from "next";

import { NOTIFICATION_RETENTION_DAYS } from "@/server/services/maintenance";

import { SiteFooter } from "../_components/site-footer";
import { SiteHeader } from "../_components/site-header";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ZEGA stores about you, who can see it, how long it is kept and how photos are handled.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "13 November 2026";

const DATA = [
  {
    what: "Account details",
    items: "Name, university email, matric or staff number, department, optional phone number, role.",
    why: "To sign you in, show who reported or is fixing a request, and route work to the right people.",
  },
  {
    what: "Requests",
    items: "Title, description, category, location, priority, status history, comments, ratings and photos.",
    why: "To get the fault fixed and keep a record of what was done and by whom.",
  },
  {
    what: "Sessions",
    items: "A session cookie, the device's browser name and IP address for each signed-in device.",
    why: "To keep you signed in and let you sign out other devices from your profile.",
  },
  {
    what: "Notifications",
    items: "In-app messages about your requests, and emails if you leave email updates switched on.",
    why: "To tell you when something changes without you having to check.",
  },
];

const ACCESS = [
  [
    "Students and staff",
    'Their own requests, plus the public details of open requests at a location when they add a "me too".',
  ],
  ["Maintenance officers", "Requests assigned to them, including internal notes."],
  ["Administrators", "All requests, users and the audit trail, to assign work and account for it."],
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-muted-foreground text-sm">Last updated {UPDATED}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Privacy</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          ZEGA collects what it needs to get campus faults fixed and nothing more. There is no advertising, no tracking
          and no selling of data.
        </p>

        <section aria-labelledby="collect" className="mt-12">
          <h2 id="collect" className="text-xl font-semibold">
            What we store and why
          </h2>
          <dl className="mt-4 divide-y rounded-xl border">
            {DATA.map((d) => (
              <div key={d.what} className="grid gap-1 p-4 sm:grid-cols-[160px_1fr] sm:gap-4">
                <dt className="font-medium">{d.what}</dt>
                <dd className="text-muted-foreground text-sm">
                  <p className="text-foreground">{d.items}</p>
                  <p className="mt-1">{d.why}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="photos" className="mt-12">
          <h2 id="photos" className="text-xl font-semibold">
            Photos
          </h2>
          <p className="text-muted-foreground mt-3">
            Photos are resized and re-encoded in your browser before upload. This removes hidden metadata such as the
            GPS position and camera details. Files are checked on the server, limited to 3 MB, and stored in Vercel
            Blob. Only people who can see the request can see its photos.
          </p>
        </section>

        <section aria-labelledby="access" className="mt-12">
          <h2 id="access" className="text-xl font-semibold">
            Who can see what
          </h2>
          <ul className="mt-4 space-y-3">
            {ACCESS.map(([who, sees]) => (
              <li key={who} className="rounded-xl border p-4">
                <p className="font-medium">{who}</p>
                <p className="text-muted-foreground mt-1 text-sm">{sees}</p>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-sm">
            Access is enforced by the server on every request, not just hidden in the interface.
          </p>
        </section>

        <section aria-labelledby="retention" className="mt-12">
          <h2 id="retention" className="text-xl font-semibold">
            How long we keep it
          </h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5">
            <li>
              Read notifications are deleted after {NOTIFICATION_RETENTION_DAYS} days. Unread ones stay until read.
            </li>
            <li>Sessions expire after 7 days without use and are then deleted.</li>
            <li>
              Requests, their history and the audit trail are kept as the university&apos;s maintenance record. The
              audit trail cannot be edited, which is what makes it trustworthy.
            </li>
          </ul>
        </section>

        <section aria-labelledby="cookies" className="mt-12">
          <h2 id="cookies" className="text-xl font-semibold">
            Cookies
          </h2>
          <p className="text-muted-foreground mt-3">
            A session cookie keeps you signed in, and a few small first-party cookies remember layout choices such as
            whether the sidebar is open. There are no analytics or third-party cookies.
          </p>
        </section>

        <section aria-labelledby="rights" className="mt-12">
          <h2 id="rights" className="text-xl font-semibold">
            Your choices
          </h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5">
            <li>
              See and sign out your devices, and switch email updates off, on your{" "}
              <Link href="/dashboard/profile" className="text-primary underline-offset-4 hover:underline">
                profile
              </Link>
              .
            </li>
            <li>Edit a request you reported until work on it starts.</li>
            <li>Ask an administrator to correct your account details or deactivate your account.</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
