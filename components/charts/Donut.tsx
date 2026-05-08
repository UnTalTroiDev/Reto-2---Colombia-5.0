"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PALETTE = ["#e0623a", "#d4a64a", "#6ba368", "#5b8db5", "#a16ba1", "#c75450", "#8a8d9e"];

type Format = "number" | "bytes" | "currency";

function formatValue(v: number, fmt: Format): string {
  if (!Number.isFinite(v)) return "—";
  if (fmt === "bytes") {
    if (v < 1024) return `${v} B`;
    if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`;
    if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(2)} MB`;
    if (v < 1024 ** 4) return `${(v / 1024 ** 3).toFixed(2)} GB`;
    return `${(v / 1024 ** 4).toFixed(2)} TB`;
  }
  if (fmt === "currency") {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)} B`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)} MM`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)} M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)} K`;
    return `$${v.toFixed(0)}`;
  }
  return new Intl.NumberFormat("es-CO").format(v);
}

export function Donut({
  data,
  height = 280,
  format = "number",
}: {
  data: { key: string; value: number }[];
  height?: number;
  format?: Format;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius={66}
            outerRadius={104}
            paddingAngle={2}
            stroke="#0b1220"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#0b1220",
              border: "1px solid #2e3a55",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              padding: "10px 12px",
            }}
            labelStyle={{ color: "#f5efe2" }}
            formatter={(v: number, name) => [formatValue(v, format), name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
