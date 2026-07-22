export function formatCurrency(amount: number | null | undefined, currency = "KES") {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}