"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Loader2, MapPin, QrCode } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/requests/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { REQUEST_PRIORITIES, type RequestPriority } from "@/domain/constants";
import { useDebounced } from "@/hooks/use-debounced";
import { preparePhoto } from "@/lib/image";
import {
  createRequest,
  errorMessage,
  type RequestDetail,
  uploadAttachment,
  useCategories,
  useLocations,
} from "@/lib/queries";

import { DuplicatePanel } from "./duplicate-panel";
import { LocationPicker } from "./location-picker";
import { PhotoPicker } from "./photo-picker";

const STEPS = ["What", "Where", "Details", "Review"] as const;
const DRAFT_KEY = "zega:report-draft";

type Draft = {
  categoryId: string | null;
  locationId: string | null;
  locationDetail: string;
  title: string;
  description: string;
  priority: RequestPriority | null;
};
const EMPTY: Draft = {
  categoryId: null,
  locationId: null,
  locationDetail: "",
  title: "",
  description: "",
  priority: null,
};

const PRIORITY_HELP: Record<RequestPriority, string> = {
  low: "Inconvenient, can wait a week",
  medium: "Needs fixing in a few days",
  high: "Disrupting work or study",
  urgent: "Danger to people or property",
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function ReportWizard({
  initialLocationId,
  lockedFromQr,
}: {
  initialLocationId: string | null;
  lockedFromQr: boolean;
}) {
  const categories = useCategories();
  const locations = useLocations();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [created, setCreated] = useState<RequestDetail | null>(null);
  const [locked, setLocked] = useState(lockedFromQr);

  // Restore an unfinished draft (photos are not persisted), letting a QR scan override the location.
  useEffect(() => {
    const saved = loadDraft();
    setDraft({ ...saved, locationId: initialLocationId ?? saved.locationId });
  }, [initialLocationId]);
  useEffect(() => {
    if (created) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable: drafts are a convenience only */
    }
  }, [draft, created]);

  const category = categories.data?.find((c) => c.id === draft.categoryId);
  const location = locations.data?.find((l) => l.id === draft.locationId);
  const priority = draft.priority ?? category?.defaultPriority ?? "medium";
  const debouncedTitle = useDebounced(draft.title.trim());
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate(s: number) {
    const e: typeof errors = {};
    if (s === 0 && !draft.categoryId) e.categoryId = "Choose what kind of problem it is.";
    if (s === 1 && !draft.locationId) e.locationId = "Choose where the problem is.";
    if (s === 2) {
      if (draft.title.trim().length < 5) e.title = "Give it a short title (at least 5 characters).";
      if (draft.description.trim().length < 10) e.description = "Describe the problem (at least 10 characters).";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => validate(step) && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    if (![0, 1, 2].every(validate)) return;
    try {
      setSubmitting("Submitting your request…");
      const request = await createRequest({
        title: draft.title.trim(),
        description: draft.description.trim(),
        categoryId: draft.categoryId,
        locationId: draft.locationId,
        locationDetail: draft.locationDetail.trim() || undefined,
        priority,
      });
      for (const [i, photo] of photos.entries()) {
        setSubmitting(`Uploading photo ${i + 1} of ${photos.length}…`);
        try {
          await uploadAttachment(request.id, await preparePhoto(photo));
        } catch (err) {
          toast.error(`Photo ${i + 1} could not be uploaded: ${errorMessage(err)}`);
        }
      }
      localStorage.removeItem(DRAFT_KEY);
      setCreated(request);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  if (created)
    return (
      <SuccessCard
        request={created}
        onAnother={() => {
          setCreated(null);
          setDraft(EMPTY);
          setPhotos([]);
          setStep(0);
          setLocked(false);
        }}
      />
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Report steps" className="lg:pt-2">
        <ol className="flex gap-2 lg:flex-col lg:gap-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1 lg:flex-none">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                  i === step
                    ? "bg-accent text-accent-foreground font-medium"
                    : i < step
                      ? "hover:bg-muted"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    i < step && "border-primary bg-primary text-primary-foreground",
                    i === step && "border-primary text-primary",
                  )}
                >
                  {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardContent className="p-5 sm:p-6">
            {step === 0 && (
              <section aria-labelledby="step-what" className="space-y-4">
                <h2 id="step-what" className="text-lg font-semibold">
                  What kind of problem is it?
                </h2>
                {categories.isPending ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : (
                  <fieldset className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Category">
                    {categories.data?.map((c) => {
                      const active = draft.categoryId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            set("categoryId", c.id);
                            set("priority", null);
                            setStep(1);
                          }}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                            active ? "border-primary bg-accent" : "hover:border-primary/40",
                          )}
                        >
                          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                            <CategoryIcon icon={c.icon} className="size-5" />
                          </span>
                          <span>
                            <span className="block font-medium">{c.name}</span>
                            <span className="text-muted-foreground block text-xs">{c.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </fieldset>
                )}
                {errors.categoryId && <p className="text-destructive text-sm">{errors.categoryId}</p>}
              </section>
            )}

            {step === 1 && (
              <section aria-labelledby="step-where" className="space-y-4">
                <h2 id="step-where" className="text-lg font-semibold">
                  Where is it?
                </h2>
                {locked && location ? (
                  <div className="bg-accent flex items-center gap-3 rounded-xl border p-4">
                    <QrCode className="text-primary size-5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{location.label}</div>
                      <div className="text-muted-foreground text-xs">Filled in from the QR sticker you scanned</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLocked(false)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <LocationPicker
                    locations={locations.data}
                    loading={locations.isPending}
                    value={draft.locationId}
                    onChange={(id) => set("locationId", id)}
                  />
                )}
                {errors.locationId && <p className="text-destructive text-sm">{errors.locationId}</p>}
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="location-detail">Exact spot (optional)</FieldLabel>
                  <Input
                    id="location-detail"
                    value={draft.locationDetail}
                    maxLength={200}
                    placeholder="e.g. second cubicle from the door, behind the projector screen"
                    onChange={(e) => set("locationDetail", e.target.value)}
                  />
                </Field>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="step-details" className="space-y-5">
                <h2 id="step-details" className="text-lg font-semibold">
                  Describe the problem
                </h2>
                <Field className="gap-1.5" data-invalid={Boolean(errors.title)}>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
                    value={draft.title}
                    maxLength={120}
                    placeholder={
                      category
                        ? `e.g. ${category.name === "Plumbing" ? "Leaking pipe under the sink" : "Short summary of the problem"}`
                        : "Short summary"
                    }
                    aria-invalid={Boolean(errors.title)}
                    onChange={(e) => set("title", e.target.value)}
                  />
                  {errors.title && <FieldError>{errors.title}</FieldError>}
                </Field>
                <Field className="gap-1.5" data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="description">What is happening?</FieldLabel>
                  <Textarea
                    id="description"
                    rows={5}
                    value={draft.description}
                    maxLength={2000}
                    placeholder="When did it start? How bad is it? Is anyone affected?"
                    aria-invalid={Boolean(errors.description)}
                    onChange={(e) => set("description", e.target.value)}
                  />
                  <div className="flex justify-between">
                    {errors.description ? <FieldError>{errors.description}</FieldError> : <span />}
                    <FieldDescription className="text-xs tabular-nums">
                      {draft.description.length}/2000
                    </FieldDescription>
                  </div>
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>How urgent is it?</FieldLabel>
                  <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Priority">
                    {REQUEST_PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={priority === p}
                        onClick={() => set("priority", p)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          priority === p ? "border-primary bg-accent" : "hover:bg-muted",
                        )}
                      >
                        <span className="block font-medium capitalize">{p}</span>
                        <span className="text-muted-foreground block text-[11px] leading-tight">
                          {PRIORITY_HELP[p]}
                        </span>
                      </button>
                    ))}
                  </fieldset>
                </Field>
                <PhotoPicker files={photos} onChange={setPhotos} max={5} />
              </section>
            )}

            {step === 3 && category && location && (
              <section aria-labelledby="step-review" className="space-y-4">
                <h2 id="step-review" className="text-lg font-semibold">
                  Check and submit
                </h2>
                <dl className="divide-y rounded-xl border text-sm">
                  {[
                    ["Category", category.name],
                    ["Location", `${location.label}${draft.locationDetail ? ` (${draft.locationDetail})` : ""}`],
                    ["Priority", priority[0].toUpperCase() + priority.slice(1)],
                    ["Title", draft.title],
                    ["Description", draft.description],
                    ["Photos", photos.length ? `${photos.length} attached` : "None"],
                  ].map(([k, v]) => (
                    <div key={k} className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="break-words whitespace-pre-wrap">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-muted-foreground text-xs">
                  You will get a reference code and can follow progress live. Administrators are notified straight away.
                </p>
              </section>
            )}
          </CardContent>
        </Card>

        {step >= 1 && step <= 2 && (
          <DuplicatePanel
            title={debouncedTitle}
            locationId={draft.locationId ?? undefined}
            categoryId={draft.categoryId ?? undefined}
            locationLabel={location?.label}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={back} disabled={step === 0 || submitting !== null} className="h-10">
            <ArrowLeft data-icon="inline-start" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} className="h-10 px-5">
              Continue <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting !== null} className="h-10 px-5">
              {submitting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              {submitting ?? "Submit request"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessCard({ request, onAnother }: { request: RequestDetail; onAnother: () => void }) {
  const due = useMemo(
    () => (request.resolutionDueAt ? new Date(request.resolutionDueAt) : null),
    [request.resolutionDueAt],
  );
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="size-8" />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Request submitted</h2>
          <p className="text-muted-foreground text-sm">
            Keep this reference code. You will be notified as it progresses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(request.refCode);
            toast.success("Reference code copied");
          }}
          className="bg-muted hover:bg-muted/70 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-semibold tracking-wide"
        >
          {request.refCode} <Copy className="text-muted-foreground size-4" />
        </button>
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPin className="size-4" /> {request.location.label}
        </div>
        {due && (
          <p className="text-sm">
            Target fix by <strong>{due.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</strong>
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button asChild className="h-10 px-5">
            <Link href={`/dashboard/requests/${request.refCode}`}>Track this request</Link>
          </Button>
          <Button variant="outline" className="h-10 px-5" onClick={onAnother}>
            Report another issue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
