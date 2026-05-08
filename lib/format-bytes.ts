export function formatBytes(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  if (num < 1024) return `${num} B`;
  if (num < 1024 ** 2) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 ** 3) return `${(num / 1024 ** 2).toFixed(2)} MB`;
  if (num < 1024 ** 4) return `${(num / 1024 ** 3).toFixed(2)} GB`;
  return `${(num / 1024 ** 4).toFixed(2)} TB`;
}
