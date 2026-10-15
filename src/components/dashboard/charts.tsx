import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(260, e[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const show = (ev: MouseEvent, html: string) => {
    const el = ref.current; if (!el) return;
    const box = el.parentElement!.getBoundingClientRect();
    el.innerHTML = html; el.style.opacity = "1";
    el.style.left = `${ev.clientX - box.left + 12}px`; el.style.top = `${ev.clientY - box.top - 10}px`;
  };
  const hide = () => { if (ref.current) ref.current.style.opacity = "0"; };
  return { ref, show, hide, node: <div ref={ref} className="chart-tooltip" /> };
}

const fmt = d3.format(",");

export function Legend({ items, active, onToggle, colors }: { items: string[]; active: string | null; onToggle: (k: string) => void; colors: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((k, i) => (
        <button key={k} onClick={() => onToggle(k)} className={`legend-chip ${active && active !== k ? "opacity-40" : ""} ${active === k ? "ring-2 ring-ring" : ""}`}>
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />{k}
        </button>
      ))}
    </div>
  );
}

export function BarChart({ data, active, onClick }: { data: { key: string; value: number }[]; active: string | null; onClick: (k: string) => void }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  const height = 300;
  useEffect(() => {
    const m = { t: 10, r: 10, b: 60, l: 50 };
    const svg = d3.select(svgRef.current!); svg.selectAll("*").remove();
    const x = d3.scaleBand().domain(data.map((d) => d.key)).range([m.l, width - m.r]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) || 1]).nice().range([height - m.b, m.t]);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.l - m.r)).tickFormat(() => ""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - m.b})`).call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end");
    const total = d3.sum(data, (d) => d.value);
    svg.append("g").selectAll("rect").data(data).join("rect")
      .attr("x", (d) => x(d.key)!).attr("width", x.bandwidth()).attr("rx", 3)
      .attr("y", (d) => y(d.value)).attr("height", (d) => y(0) - y(d.value))
      .style("fill", (d) => (active && active !== d.key ? "var(--muted-foreground)" : "var(--chart-1)"))
      .style("opacity", (d) => (active && active !== d.key ? 0.35 : 1)).style("cursor", "pointer")
      .on("mousemove", (ev, d) => tip.show(ev, `<b>${d.key}</b><br/>${fmt(d.value)} admissions (${((d.value / (total || 1)) * 100).toFixed(1)}%)`))
      .on("mouseleave", tip.hide).on("click", (_, d) => onClick(d.key));
  }, [data, width, active]);
  return <div ref={wrap} className="relative"><svg ref={svgRef} width={width} height={height} role="img" aria-label="Admissions by disease" />{tip.node}</div>;
}

export function DonutChart({ data, active, onClick }: { data: { key: string; value: number }[]; active: string | null; onClick: (k: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  const size = 260;
  useEffect(() => {
    const svg = d3.select(svgRef.current!); svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${size / 2},${size / 2})`);
    const total = d3.sum(data, (d) => d.value);
    const pie = d3.pie<{ key: string; value: number }>().value((d) => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ key: string; value: number }>>().innerRadius(70).outerRadius(120).cornerRadius(3).padAngle(0.01);
    g.selectAll("path").data(pie(data)).join("path").attr("d", arc)
      .style("fill", (_, i) => PALETTE[i]).style("opacity", (d) => (active && active !== d.data.key ? 0.3 : 1)).style("cursor", "pointer")
      .on("mousemove", (ev, d) => tip.show(ev, `<b>Age ${d.data.key}</b><br/>${fmt(d.data.value)} patients (${((d.data.value / (total || 1)) * 100).toFixed(1)}%)`))
      .on("mouseleave", tip.hide).on("click", (_, d) => onClick(d.data.key));
    g.append("text").attr("text-anchor", "middle").attr("dy", "-0.1em").attr("class", "donut-total").text(fmt(total));
    g.append("text").attr("text-anchor", "middle").attr("dy", "1.4em").attr("class", "donut-label").text("patients");
  }, [data, active]);
  return <div className="relative flex justify-center"><svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Age groups" />{tip.node}</div>;
}

export function StackedBarChart({ rows, keys, activeKey }: { rows: Record<string, number | string>[]; keys: string[]; activeKey: string | null }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  const height = 300;
  useEffect(() => {
    const m = { t: 10, r: 10, b: 70, l: 50 };
    const svg = d3.select(svgRef.current!); svg.selectAll("*").remove();
    const stack = d3.stack<Record<string, number | string>>().keys(keys).value((d, k) => Number(d[k]) || 0)(rows);
    const x = d3.scaleBand().domain(rows.map((r) => String(r.department))).range([m.l, width - m.r]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(stack, (s) => d3.max(s, (d) => d[1])) || 1]).nice().range([height - m.b, m.t]);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.l - m.r)).tickFormat(() => ""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - m.b})`).call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end");
    svg.append("g").selectAll("g").data(stack).join("g")
      .style("fill", (_, i) => PALETTE[i]).style("opacity", (s) => (activeKey && activeKey !== s.key ? 0.25 : 1))
      .selectAll("rect").data((s) => s.map((d) => ({ d, key: s.key }))).join("rect")
      .attr("x", ({ d }) => x(String(d.data.department))!).attr("width", x.bandwidth())
      .attr("y", ({ d }) => y(d[1])).attr("height", ({ d }) => Math.max(0, y(d[0]) - y(d[1])))
      .on("mousemove", (ev, { d, key }) => tip.show(ev, `<b>${d.data.department}</b><br/>${key}: ${fmt(d[1] - d[0])}`))
      .on("mouseleave", tip.hide);
  }, [rows, keys, width, activeKey]);
  return <div ref={wrap} className="relative"><svg ref={svgRef} width={width} height={height} role="img" aria-label="Department by admission type" />{tip.node}</div>;
}

export function LineChart({ data }: { data: { month: Date; value: number }[] }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  const height = 280;
  useEffect(() => {
    const m = { t: 15, r: 20, b: 30, l: 50 };
    const svg = d3.select(svgRef.current!); svg.selectAll("*").remove();
    if (!data.length) { svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").attr("class", "donut-label").text("No data"); return; }
    const x = d3.scaleTime().domain(d3.extent(data, (d) => d.month) as [Date, Date]).range([m.l, width - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) || 1]).nice().range([height - m.b, m.t]);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.l - m.r)).tickFormat(() => ""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - m.b})`)
      .call(d3.axisBottom<Date>(x).ticks(Math.min(12, data.length)).tickFormat(d3.timeFormat("%b")));
    svg.append("path").datum(data).style("fill", "var(--chart-2)").style("opacity", 0.12)
      .attr("d", d3.area<{ month: Date; value: number }>().x((d) => x(d.month)).y0(y(0)).y1((d) => y(d.value)).curve(d3.curveMonotoneX));
    svg.append("path").datum(data).style("fill", "none").style("stroke", "var(--chart-2)").attr("stroke-width", 2.5)
      .attr("d", d3.line<{ month: Date; value: number }>().x((d) => x(d.month)).y((d) => y(d.value)).curve(d3.curveMonotoneX));
    svg.append("g").selectAll("circle").data(data).join("circle").attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.value)).attr("r", 4.5)
      .style("fill", "var(--card)").style("stroke", "var(--chart-1)").attr("stroke-width", 2)
      .on("mousemove", (ev, d) => tip.show(ev, `<b>${d3.timeFormat("%B %Y")(d.month)}</b><br/>${fmt(d.value)} admissions`)).on("mouseleave", tip.hide);
  }, [data, width]);
  return <div ref={wrap} className="relative"><svg ref={svgRef} width={width} height={height} role="img" aria-label="Monthly admissions" />{tip.node}</div>;
}

export function HBarChart({ data, active, onClick }: { data: { key: string; value: number; n: number }[]; active: string | null; onClick: (k: string) => void }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  const height = Math.max(120, data.length * 38 + 40);
  useEffect(() => {
    const m = { t: 5, r: 45, b: 30, l: 125 };
    const svg = d3.select(svgRef.current!); svg.selectAll("*").remove();
    const y = d3.scaleBand().domain(data.map((d) => d.key)).range([m.t, height - m.b]).padding(0.25);
    const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) || 1]).nice().range([m.l, width - m.r]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - m.b})`).call(d3.axisBottom(x).ticks(5));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y));
    const g = svg.append("g").selectAll("g").data(data).join("g").style("cursor", "pointer")
      .on("mousemove", (ev, d) => tip.show(ev, `<b>${d.key}</b><br/>Avg stay: ${d.value.toFixed(1)} days<br/>${fmt(d.n)} admissions`))
      .on("mouseleave", tip.hide).on("click", (_, d) => onClick(d.key));
    g.append("rect").attr("x", m.l).attr("y", (d) => y(d.key)!).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("width", (d) => x(d.value) - m.l).style("fill", "var(--chart-2)").style("opacity", (d) => (active && active !== d.key ? 0.3 : 1));
    g.append("text").attr("class", "bar-value").attr("x", (d) => x(d.value) + 5).attr("y", (d) => y(d.key)! + y.bandwidth() / 2).attr("dy", "0.35em").text((d) => d.value.toFixed(1));
  }, [data, width, active]);
  return <div ref={wrap} className="relative"><svg ref={svgRef} width={width} height={height} role="img" aria-label="Average length of stay by department" />{tip.node}</div>;
}
