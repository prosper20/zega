import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

import { type RequestStatus, STATUS_LABELS } from "@/domain/constants";
import type { summary } from "@/server/services/reports";

type Summary = Awaited<ReturnType<typeof summary>>;

const C = {
  blue: "#246cff",
  navy: "#001e40",
  grey: "#4c6177",
  line: "#e5e8ec",
  bg: "#f4f9fd",
  green: "#027a48",
  red: "#b42318",
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, color: C.navy, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: C.blue,
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.blue, letterSpacing: 2 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  muted: { color: C.grey },
  h2: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6 },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpi: { width: "31.8%", backgroundColor: C.bg, borderRadius: 6, padding: 10 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4 },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 5, paddingHorizontal: 8 },
  th: {
    flexDirection: "row",
    backgroundColor: C.bg,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    color: C.grey,
    fontSize: 8.5,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 90,
    gap: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.grey,
  },
});

function Table({
  cols,
  rows,
}: {
  cols: { label: string; flex: number; align?: "right" }[];
  rows: (string | number)[][];
}) {
  return (
    <View style={s.table}>
      <View style={s.th}>
        {cols.map((c) => (
          <Text key={c.label} style={{ flex: c.flex, textAlign: c.align }}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static PDF rows
        <View key={i} style={s.tr} wrap={false}>
          {r.map((v, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static PDF cells
            <Text key={j} style={{ flex: cols[j].flex, textAlign: cols[j].align }}>
              {String(v)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function SummaryDocument({ data, generatedBy }: { data: Summary; generatedBy: string }) {
  const t = data.totals;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const maxDaily = Math.max(1, ...data.daily.map((d) => Math.max(d.created, d.resolved)));
  const kpis = [
    ["Requests reported", t.total],
    ["Still open", t.open],
    ["Overdue (open)", t.breachedOpen],
    ["SLA compliance", t.slaCompliance === null ? "n/a" : `${t.slaCompliance}%`],
    ["Avg. time to resolve", t.avgResolutionHours === null ? "n/a" : `${t.avgResolutionHours} h`],
    ["Satisfaction", t.avgRating === null ? "n/a" : `${t.avgRating.toFixed(2)} / 5 (${t.ratings})`],
  ];
  return (
    <Document
      title={`ZEGA report ${data.range.from.slice(0, 10)} to ${data.range.to.slice(0, 10)}`}
      author="ZEGA"
      creator="ZEGA"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>ZEGA</Text>
            <Text style={s.title}>Maintenance performance report</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>
              {fmt(data.range.from)} to {fmt(data.range.to)}
            </Text>
            <Text style={s.muted}>
              Generated {new Date().toLocaleString("en-GB")} by {generatedBy}
            </Text>
          </View>
        </View>

        <View style={s.kpis}>
          {kpis.map(([label, value]) => (
            <View key={label} style={s.kpi}>
              <Text style={s.muted}>{label}</Text>
              <Text style={s.kpiValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Daily volume</Text>
        <View style={s.bars}>
          {data.daily.map((d) => (
            <View key={d.day} style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 0.5 }}>
              <View style={{ flex: 1, height: `${(d.created / maxDaily) * 100}%`, backgroundColor: C.blue }} />
              <View style={{ flex: 1, height: `${(d.resolved / maxDaily) * 100}%`, backgroundColor: "#2ed888" }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <Text style={{ color: C.blue }}>■ Reported</Text>
          <Text style={{ color: C.green }}>■ Resolved</Text>
          <Text style={s.muted}>
            Peak: {maxDaily} per day over {data.daily.length} days
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>By status</Text>
            <Table
              cols={[
                { label: "Status", flex: 2 },
                { label: "Requests", flex: 1, align: "right" },
              ]}
              rows={data.byStatus.map((x) => [STATUS_LABELS[x.status as RequestStatus] ?? x.status, x.count])}
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Text style={s.h2}>By category</Text>
            <Table
              cols={[
                { label: "Category", flex: 2 },
                { label: "Total", flex: 1, align: "right" },
                { label: "Open", flex: 1, align: "right" },
                { label: "Avg h", flex: 1, align: "right" },
              ]}
              rows={data.byCategory.map((c) => [c.category, c.count, c.open, c.avgResolutionHours ?? "n/a"])}
            />
          </View>
        </View>

        <Text style={s.h2}>Officer performance</Text>
        <Table
          cols={[
            { label: "Officer", flex: 2 },
            { label: "Open jobs", flex: 1, align: "right" },
            { label: "Resolved in period", flex: 1.3, align: "right" },
            { label: "Avg. rating", flex: 1, align: "right" },
          ]}
          rows={data.officers.map((o) => [o.name, o.open, o.resolved, o.avgRating ? o.avgRating.toFixed(2) : "n/a"])}
        />

        <Text style={s.h2}>Hotspots</Text>
        <Table
          cols={[
            { label: "Building or hostel", flex: 3 },
            { label: "Requests", flex: 1, align: "right" },
          ]}
          rows={data.hotspots.map((h) => [h.name, h.count])}
        />

        <View style={s.footer} fixed>
          <Text>ZEGA · Report it. Track it. Resolve it.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderSummaryPdf(data: Summary, generatedBy: string) {
  return renderToBuffer(<SummaryDocument data={data} generatedBy={generatedBy} />);
}
