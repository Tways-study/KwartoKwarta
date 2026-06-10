import { cn } from "@/lib/utils";

/** A spinning peso coin — the app's loading mark. */
export function Spinner({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 border-line-strong border-t-gold-deep font-mono font-bold text-gold-deep motion-safe:animate-spin",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
