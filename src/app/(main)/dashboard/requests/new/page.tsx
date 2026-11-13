import type { Metadata } from "next";

import { db } from "@/server/db";
import { locationByQr } from "@/server/services/catalog";
import { requireRole } from "@/server/session";

import { PageHeader } from "../../_components/page-header";
import { ReportWizard } from "./_components/report-wizard";

export const metadata: Metadata = { title: "Report an issue | ZEGA" };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ qr?: string; loc?: string }>;
}) {
  await requireRole("student", "staff");
  const { qr, loc } = await searchParams;
  // A scanned QR sticker pre-selects (and locks) the location.
  const fromQr = qr ? await locationByQr(db, qr).catch(() => null) : null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Report an issue" description="Tell us what is wrong and where. It takes about a minute." />
      <ReportWizard initialLocationId={fromQr?.id ?? loc ?? null} lockedFromQr={Boolean(fromQr)} />
    </div>
  );
}
