import type { LucideIcon } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import { PageHeader } from "./page-header";

/** Temporary screen for routes whose feature is built in a later phase. */
export function Placeholder({
  title,
  description,
  icon: Icon,
  message,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>Nothing to show yet</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
