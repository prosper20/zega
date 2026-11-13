"use client";

import { useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { preparePhoto } from "@/lib/image";
import { errorMessage, keys, type RequestDetail, uploadAttachment } from "@/lib/queries";

type Kind = RequestDetail["can"]["upload"][number];
const LABEL: Record<Kind, string> = { evidence: "Photo", before: "Before", after: "After" };

/** Adds photos to an existing request: evidence for requesters, before/after for the assigned officer. */
export function PhotoUploader({ request }: { request: RequestDetail }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const kinds = request.can.upload;
  const [kind, setKind] = useState<Kind>(
    kinds.includes("after") && request.status === "in_progress" ? "after" : kinds[0],
  );
  const [busy, setBusy] = useState<string | null>(null);
  if (!kinds.length) return null;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    let ok = 0;
    for (const [i, file] of Array.from(files).entries()) {
      setBusy(`Uploading ${i + 1}/${files.length}…`);
      try {
        await uploadAttachment(request.id, await preparePhoto(file), kind);
        ok++;
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }
    setBusy(null);
    if (ok) {
      toast.success(`${ok} ${LABEL[kind].toLowerCase()} photo${ok > 1 ? "s" : ""} added`);
      void qc.invalidateQueries({ queryKey: keys.detail(request.refCode) });
      void qc.invalidateQueries({ queryKey: keys.timeline(request.refCode) });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {kinds.length > 1 && (
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={kind}
          onValueChange={(v) => v && setKind(v as Kind)}
          aria-label="Photo type"
        >
          {kinds.map((k) => (
            <ToggleGroupItem key={k} value={k} className="px-3">
              {LABEL[k]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy !== null}>
        {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Camera data-icon="inline-start" />}
        {busy ?? `Add ${LABEL[kind].toLowerCase()} photo`}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
