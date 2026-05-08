"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = { key: string; value: number };
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

export function BarRanking({
  data,
  format = "number",
  color = "#e0623a",
  height = 360,
}: {
  data: Datum[];
  format?: Format;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="#243049" horizontal={false} strokeDasharray="2 4" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatValue(v, format)}
            stroke="#6b6e80"
            fontSize={10}
            axisLine={false}
            tickLine={false}
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            type="category"
            dataKey="key"
            stroke="#8a8d9e"
            fontSize={11}
            width={180}
            axisLine={false}
            tickLine={false}
            tick={{ textAnchor: "end" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(224, 98, 58, 0.06)" }}
            contentStyle={{
              background: "#0b1220",
              border: "1px solid #2e3a55",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              padding: "10px 12px",
            }}
            labelStyle={{ color: "#f5efe2", fontWeight: 600, marginBottom: 4 }}
            formatter={(v: number) => [formatValue(v, format), ""]}
          />
          <Bar dataKey="value" fill={color} radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
