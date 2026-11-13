"use client";

import { useState } from "react";

import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, type RequestDetail, useTransition } from "@/lib/queries";

import { StarRating } from "./star-rating";

type Option = RequestDetail["availableTransitions"][number];

const NOTE_PROMPT: Partial<Record<Option["to"], string>> = {
  rejected: "Why is this request being rejected?",
  on_hold: "What is it waiting for?",
  resolved: "What was done to fix it?",
  reopened: "What is still wrong?",
  cancelled: "Why is it being cancelled?",
};

/**
 * The next steps the viewer may take, straight from the API (which applies the lifecycle rules).
 * "Assign" is handled by the admin assignment panel, so it is not shown here.
 */
export function ActionsPanel({ request, extra }: { request: RequestDetail; extra?: React.ReactNode }) {
  const transition = useTransition(request.id);
  const [open, setOpen] = useState<Option | null>(null);
  const [note, setNote] = useState("");
  const [score, setScore] = useState(0);

  const options = request.availableTransitions.filter((t) => t.to !== "assigned");
  if (!options.length && !extra) return null;

  const isConfirm = open?.to === "closed";
  const needsNote = Boolean(open?.requiresNote);

  async function run() {
    if (!open) return;
    if (needsNote && !note.trim()) return toast.error("Please add a note.");
    transition.mutate(
      { to: open.to, note: note.trim() || undefined, ...(isConfirm && score ? { rating: { score } } : {}) },
      {
        onSuccess: () => {
          toast.success(isConfirm ? "Thanks for confirming!" : `Request ${open.label.toLowerCase()}`);
          setOpen(null);
          setNote("");
          setScore(0);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  const awaitingConfirm = request.status === "resolved" && options.some((o) => o.to === "closed");

  return (
    <Card className={awaitingConfirm ? "border-emerald-300 dark:border-emerald-500/40" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">{awaitingConfirm ? "Is it fixed?" : "Actions"}</CardTitle>
        {awaitingConfirm && (
          <CardDescription>
            The officer marked this resolved. Confirm the fix, or reopen it if the problem is still there.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {options.map((o) => (
          <Button
            key={o.to}
            variant={
              o.to === "closed" || o.to === "resolved" || o.to === "in_progress"
                ? "default"
                : o.to === "cancelled" || o.to === "rejected"
                  ? "destructive"
                  : "outline"
            }
            className="h-9 justify-start"
            onClick={() => setOpen(o)}
          >
            {o.to === "closed" && <CheckCircle2 data-icon="inline-start" />}
            {o.to === "reopened" && <RotateCcw data-icon="inline-start" />}
            {o.label}
          </Button>
        ))}
        {extra}
      </CardContent>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open?.label}</DialogTitle>
            <DialogDescription>
              {isConfirm
                ? "How was the service? Your rating helps improve maintenance on campus."
                : `${request.refCode}: ${request.title}`}
            </DialogDescription>
          </DialogHeader>
          {isConfirm && (
            <div className="flex flex-col items-center gap-2 py-2">
              <StarRating value={score} onChange={setScore} />
              <span className="text-muted-foreground text-xs">{score ? `${score} out of 5` : "Optional"}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="transition-note">
              {(open && NOTE_PROMPT[open.to]) ?? "Add a note"}{" "}
              {needsNote ? "" : <span className="text-muted-foreground font-normal">(optional)</span>}
            </Label>
            <Textarea
              id="transition-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button onClick={run} disabled={transition.isPending || (needsNote && !note.trim())}>
              {transition.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {open?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
