import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)} B`; // billones (es)
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)} MM`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)} M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)} K`;
  return `$${num.toFixed(0)}`;
}

export function formatPct(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}
