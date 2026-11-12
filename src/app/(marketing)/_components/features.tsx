import {
  Armchair,
  Bell,
  BookOpen,
  Building2,
  Droplets,
  FileDown,
  Fingerprint,
  Lightbulb,
  Presentation,
  Search,
  TimerReset,
  Wifi,
} from "lucide-react";

const FEATURES = [
  {
    icon: TimerReset,
    title: "SLA timers that escalate",
    body: "Every category and priority has response and resolution targets. Breaches are flagged and escalated to admins automatically.",
  },
  {
    icon: Bell,
    title: "Real-time updates",
    body: "Status changes, assignments and comments appear instantly in the app and by email. No refreshing, no chasing.",
  },
  {
    icon: Fingerprint,
    title: "Tamper-evident audit trail",
    body: "Every change is recorded with who, what and when, and each entry is hash-chained to the last so edits to history are detectable.",
  },
  {
    icon: Search,
    title: "Search, filter, paginate",
    body: "Full-text search with filters for status, category, priority, location, officer and date, all kept in a shareable URL.",
  },
  {
    icon: FileDown,
    title: "Reports and exports",
    body: "Generate PDF summaries and CSV exports of any filtered view for management meetings and audits.",
  },
  {
    icon: BookOpen,
    title: "Documented REST API",
    body: "An OpenAPI 3.1 spec generated from the same schemas that validate requests, with interactive docs and a Postman collection.",
  },
];

const CATEGORIES = [
  { icon: Lightbulb, label: "Faulty electricity" },
  { icon: Armchair, label: "Damaged furniture" },
  { icon: Droplets, label: "Leaking pipes" },
  { icon: Wifi, label: "Internet problems" },
  { icon: Presentation, label: "Classroom equipment" },
  { icon: Building2, label: "Hostel maintenance" },
];

export function Features() {
  return (
    <section id="features" className="bg-card scroll-mt-16 border-y py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Accountability{" "}
            <span className="from-primary bg-gradient-to-r to-emerald-400 bg-clip-text text-transparent">built in</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Everything a university needs to replace manual complaints with a process people can trust.
          </p>
        </div>
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-t pt-6">
              <f.icon className="text-primary size-6" />
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-20 text-center">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Report anything that needs fixing</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((c) => (
              <span
                key={c.label}
                className="bg-background inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
              >
                <c.icon className="text-primary size-4" /> {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
