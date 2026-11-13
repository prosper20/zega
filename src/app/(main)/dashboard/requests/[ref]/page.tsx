import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { AssignPanel } from "@/components/requests/assign-panel";
import { RequestView } from "@/components/requests/request-view";
import { Problem } from "@/server/api/problem";
import { db } from "@/server/db";
import { getRequest } from "@/server/services/requests";
import { requireUser } from "@/server/session";

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).ref) };
}

/** Request tracking page, shared by every role (visibility is enforced by the service). */
export default async function RequestPage({ params }: Props) {
  const user = await requireUser();
  const { ref } = await params;
  const request = await getRequest(db, user, decodeURIComponent(ref)).catch((e) => {
    if (e instanceof Problem && e.status === 404) notFound();
    throw e;
  });
  const back =
    user.role === "admin"
      ? { href: "/dashboard/admin/requests", label: "All requests" }
      : user.role === "officer"
        ? { href: "/dashboard/work", label: "My work orders" }
        : { href: "/dashboard/requests", label: "My requests" };
  return (
    <RequestView
      initial={request}
      backHref={back.href}
      backLabel={back.label}
      sidebarTop={user.role === "admin" ? <AssignPanel initial={request} /> : undefined}
    />
  );
}
