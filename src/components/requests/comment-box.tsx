"use client";

import { useState } from "react";

import { Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, useComment } from "@/lib/queries";

export function CommentBox({ requestId, allowInternal }: { requestId: string; allowInternal: boolean }) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const comment = useComment(requestId);

  function submit() {
    if (!body.trim()) return;
    comment.mutate(
      { body: body.trim(), internal },
      {
        onSuccess: () => {
          setBody("");
          toast.success(internal ? "Internal note added" : "Comment posted");
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="comment" className="sr-only">
        Add a comment
      </Label>
      <Textarea
        id="comment"
        rows={3}
        placeholder={
          internal ? "Internal note (only officers and admins can see this)" : "Add a comment or ask a question…"
        }
        value={body}
        maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        className={internal ? "border-amber-300 bg-amber-50/50 dark:bg-amber-500/5" : undefined}
      />
      <div className="flex items-center justify-between gap-2">
        {allowInternal ? (
          <div className="flex items-center gap-2">
            <Checkbox id="internal" checked={internal} onCheckedChange={(v) => setInternal(Boolean(v))} />
            <Label htmlFor="internal" className="flex items-center gap-1 text-sm font-normal">
              <Lock className="size-3.5" /> Internal note
            </Label>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Ctrl + Enter to send</span>
        )}
        <Button size="sm" onClick={submit} disabled={!body.trim() || comment.isPending}>
          {comment.isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          {internal ? "Add note" : "Comment"}
        </Button>
      </div>
    </div>
  );
}
