"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Copy, MapPin, ThumbsUp, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { type RequestDetail, useRequest, useTimeline } from "@/lib/queries";

import { ActionsPanel } from "./actions-panel";
import { CategoryIcon, PriorityBadge, SlaBadge, StatusBadge } from "./badges";
import { CommentBox } from "./comment-box";
import { EditRequestDialog } from "./edit-dialog";
import { PhotoGallery } from "./photo-gallery";
import { PhotoUploader } from "./photo-uploader";
import { SlaCard as SlaCardLazy } from "./sla-card";
import { RequestStepper } from "./stepper";
import { Timeline } from "./timeline";

/**
 * Full request page shared by every role. What the viewer can do (edit, transitions, internal notes,
 * assignment via `sidebarExtra`) comes from the API, so the same component serves students, officers and admins.
 */
export function RequestView({
  initial,
  backHref,
  backLabel,
  sidebarTop,
  actionsExtra,
}: {
  initial: RequestDetail;
  backHref: string;
  backLabel: string;
  sidebarTop?: ReactNode;
  actionsExtra?: ReactNode;
}) {
  const { data: request = initial } = useRequest(initial.refCode, initial);
  const timeline = useTimeline(initial.refCode);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(request.refCode);
                toast.success("Reference code copied");
              }}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-sm"
            >
              {request.refCode} <Copy className="size-3.5" />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight break-words">{request.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              <SlaBadge state={request.sla.resolution} />
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <CategoryIcon icon={request.category.icon} className="size-4" /> {request.category.name}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {request.location.label}
              </span>
            </div>
          </div>
          {request.can.edit && <EditRequestDialog request={request} />}
        </div>
      </div>

      <Card>
        <CardContent className="py-5">
          <RequestStepper status={request.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>
              {request.locationDetail && (
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium">Exact spot:</span> {request.locationDetail}
                </p>
              )}
              <PhotoGallery photos={request.attachments} />
              <PhotoUploader request={request} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Timeline items={timeline.data} loading={timeline.isPending} />
              {!["closed", "rejected", "cancelled"].includes(request.status) && (
                <CommentBox requestId={request.refCode} allowInternal={request.can.internalNotes} />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          {sidebarTop}
          <ActionsPanel request={request} extra={actionsExtra} />
          <SlaCardLazy request={request} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">People</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <UserAvatar
                  id={request.requester.id}
                  userRole={request.requester.role ?? "student"}
                  name={request.requester.name}
                  size={32}
                />
                <div className="min-w-0">
                  <div className="truncate font-medium">{request.requester.name}</div>
                  <div className="text-muted-foreground text-xs">Reported this request</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {request.assignee ? (
                  <UserAvatar id={request.assignee.id} userRole="officer" name={request.assignee.name} size={32} />
                ) : (
                  <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full">
                    <Wrench className="size-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{request.assignee?.name ?? "Not assigned yet"}</div>
                  <div className="text-muted-foreground text-xs">Maintenance officer</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsUp className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">Me too</span>
                <span className="ml-auto font-medium">{request.voteCount}</span>
              </div>
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Reported {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                {request.rating && ` · rated ${request.rating.score}/5`}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
