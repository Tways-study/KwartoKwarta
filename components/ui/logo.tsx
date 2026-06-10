import { cn } from "@/lib/utils";

export function CoinMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gold-deep font-mono font-bold text-white shadow-[0_8px_18px_-8px_var(--color-gold-deep)] ring-2 ring-gold-soft",
        className,
      )}
      aria-hidden
    >
      ₱
    </span>
  );
}

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const coin =
    size === "lg" ? "h-9 w-9 text-lg" : size === "sm" ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CoinMark className={coin} />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          text,
        )}
      >
        Kwarto<span className="text-gold-deep">Kwarta</span>
      </span>
    </span>
  );
}
