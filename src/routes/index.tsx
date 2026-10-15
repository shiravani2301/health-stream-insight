import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as d3 from "d3";
import { admissions, DISEASES, DEPARTMENTS, AGE_GROUPS, GENDERS, ADMISSION_TYPES } from "@/data/syntheticAdmissions";
import { BarChart, DonutChart, StackedBarChart, LineChart, HBarChart, Legend, PALETTE } from "@/components/dashboard/charts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hospital Patient Flow & Disease Burden Explorer" },
      { name: "description", content: "Interactive D3 dashboard analysing admissions, disease burden, demographics, department workload and length of stay (synthetic data)." },
      { property: "og:title", content: "Hospital Patient Flow & Disease Burden Explorer" },
      { property: "og:description", content: "Interactive academic big-data visualization dashboard of hospital admissions using synthetic sample data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Filters = { from: string; to: string; disease: string | null; department: string | null; ageGroup: string | null; gender: string | null; admissionType: string | null };
const MIN = d3.min(admissions, (d) => d.date)!;
const MAX = d3.max(admissions, (d) => d.date)!;
const EMPTY: Filters = { from: MIN, to: MAX, disease: null, department: null, ageGroup: null, gender: null, admissionType: null };

function Select({ label, value, options, onChange }: { label: string; value: string | null; options: readonly string[]; onChange: (v: string | null) => void }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="filter-input">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      {sub && <p className="panel-sub">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Dashboard() {
  const [f, setF] = useState<Filters>(EMPTY);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k: "disease" | "department" | "ageGroup" | "admissionType", v: string) => setF((p) => ({ ...p, [k]: p[k] === v ? null : v }));

  const rows = useMemo(() => admissions.filter((d) =>
    d.date >= f.from && d.date <= f.to &&
    (!f.disease || d.disease === f.disease) && (!f.department || d.department === f.department) &&
    (!f.ageGroup || d.ageGroup === f.ageGroup) && (!f.gender || d.gender === f.gender) &&
    (!f.admissionType || d.admissionType === f.admissionType)), [f]);

  const v = useMemo(() => {
    const byDisease = DISEASES.map((k) => ({ key: k, value: rows.filter((r) => r.disease === k).length })).sort((a, b) => b.value - a.value);
    const byAge = AGE_GROUPS.map((k) => ({ key: k, value: rows.filter((r) => r.ageGroup === k).length }));
    const stacked = DEPARTMENTS.map((dep) => {
      const o: Record<string, number | string> = { department: dep };
      ADMISSION_TYPES.forEach((t) => (o[t] = rows.filter((r) => r.department === dep && r.admissionType === t).length));
      return o;
    });
    const monthly = d3.rollups(rows, (g) => g.length, (r) => r.date.slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, value]) => ({ month: new Date(`${m}-01T00:00:00`), value }));
    const los = d3.rollups(rows, (g) => ({ value: d3.mean(g, (r) => r.los)!, n: g.length }), (r) => r.department)
      .map(([key, o]) => ({ key, ...o })).sort((a, b) => b.value - a.value);
    const deptCounts = d3.rollups(rows, (g) => g.length, (r) => r.department).sort((a, b) => b[1] - a[1]);
    return {
      byDisease, byAge, stacked, monthly, los,
      total: rows.length,
      avgLos: rows.length ? d3.mean(rows, (r) => r.los)! : 0,
      topDisease: byDisease[0]?.value ? byDisease[0] : null,
      busiest: deptCounts[0] ?? null,
    };
  }, [rows]);

  const activeCount = Object.entries(f).filter(([k, val]) => (k === "from" ? val !== MIN : k === "to" ? val !== MAX : val)).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="dash-header">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="eyebrow">Big Data Visualization · Academic Project</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Hospital Patient Flow &amp; Disease Burden Explorer</h1>
          <div className="synthetic-banner mt-3">
            <strong>Synthetic sample data.</strong> All {admissions.length.toLocaleString()} records are computer-generated for demonstration and do not represent any real hospital or patient.
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="panel-title">Filters {activeCount > 0 && <span className="filter-badge">{activeCount} active</span>}</h2>
            <button onClick={() => setF(EMPTY)} disabled={activeCount === 0} className="btn-clear">Clear all filters</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            <label className="filter-field"><span>From</span><input type="date" className="filter-input" min={MIN} max={f.to} value={f.from} onChange={(e) => set("from", e.target.value || MIN)} /></label>
            <label className="filter-field"><span>To</span><input type="date" className="filter-input" min={f.from} max={MAX} value={f.to} onChange={(e) => set("to", e.target.value || MAX)} /></label>
            <Select label="Disease" value={f.disease} options={DISEASES} onChange={(x) => set("disease", x)} />
            <Select label="Department" value={f.department} options={DEPARTMENTS} onChange={(x) => set("department", x)} />
            <Select label="Age group" value={f.ageGroup} options={AGE_GROUPS} onChange={(x) => set("ageGroup", x)} />
            <Select label="Gender" value={f.gender} options={GENDERS} onChange={(x) => set("gender", x)} />
            <Select label="Admission type" value={f.admissionType} options={ADMISSION_TYPES} onChange={(x) => set("admissionType", x)} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="kpi"><p className="kpi-label">Total admissions</p><p className="kpi-value">{v.total.toLocaleString()}</p></div>
          <div className="kpi"><p className="kpi-label">Average length of stay</p><p className="kpi-value">{v.avgLos.toFixed(1)} <span className="kpi-unit">days</span></p></div>
          <div className="kpi"><p className="kpi-label">Most common disease</p><p className="kpi-value kpi-text">{v.topDisease?.key ?? "—"}</p><p className="kpi-unit">{v.topDisease ? `${v.topDisease.value.toLocaleString()} cases` : ""}</p></div>
          <div className="kpi"><p className="kpi-label">Busiest department</p><p className="kpi-value kpi-text">{v.busiest?.[0] ?? "—"}</p><p className="kpi-unit">{v.busiest ? `${v.busiest[1].toLocaleString()} admissions` : ""}</p></div>
        </section>

        {v.total === 0 && <p className="panel text-center text-muted-foreground">No admissions match these filters. Try clearing some.</p>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><Card title="Admissions by disease" sub="Click a bar to filter by disease"><BarChart data={v.byDisease} active={f.disease} onClick={(k) => toggle("disease", k)} /></Card></div>
          <Card title="Patient age groups" sub="Click a slice or legend item to filter">
            <DonutChart data={v.byAge} active={f.ageGroup} onClick={(k) => toggle("ageGroup", k)} />
            <Legend items={AGE_GROUPS} active={f.ageGroup} onToggle={(k) => toggle("ageGroup", k)} colors={PALETTE} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Department workload by admission type" sub="Click a legend item to filter by admission type">
            <StackedBarChart rows={v.stacked} keys={[...ADMISSION_TYPES]} activeKey={f.admissionType} />
            <Legend items={[...ADMISSION_TYPES]} active={f.admissionType} onToggle={(k) => toggle("admissionType", k)} colors={PALETTE} />
          </Card>
          <Card title="Monthly admissions trend" sub="Hover points for monthly totals"><LineChart data={v.monthly} /></Card>
        </div>

        <Card title="Average length of stay by department" sub="Click a bar to filter by department"><HBarChart data={v.los} active={f.department} onClick={(k) => toggle("department", k)} /></Card>

        <footer className="pb-6 text-center text-xs text-muted-foreground">Synthetic data generated in <code>src/data/syntheticAdmissions.ts</code> — replace with a verified CSV dataset for real analysis.</footer>
      </main>
    </div>
  );
}
