"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * A dialog on desktop and a bottom sheet on phones (within thumb reach, per Apple HIG),
 * with one API so callers do not branch.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
        >
          <div aria-hidden="true" className="bg-muted-foreground/30 mx-auto mt-2 h-1 w-10 rounded-full" />
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-2">{children}</div>
          {footer && (
            <SheetFooter className="flex-col-reverse gap-2 [&>button]:h-11 [&>button]:w-full">{footer}</SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
