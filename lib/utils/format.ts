const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as Philippine pesos, e.g. 1234.5 -> "₱1,234.50". */
export function formatPHP(amount: number): string {
  return phpFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/** Signed peso amount with an explicit + / − prefix (for balances). */
export function formatSignedPHP(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${phpFormatter.format(Math.abs(value))}`;
}

/** First-name + last-initial, used in tight UI like avatars/ledger rows. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
