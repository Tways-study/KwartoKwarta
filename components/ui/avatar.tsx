import Image from "next/image";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
}

// Deterministic warm hue per person so members are recognizable at a glance.
const HUES = [
  "bg-cat-electric/15 text-cat-electric",
  "bg-cat-water/15 text-cat-water",
  "bg-cat-internet/15 text-cat-internet",
  "bg-cat-grocery/15 text-cat-grocery",
  "bg-cat-rent/15 text-cat-rent",
  "bg-cat-cleaning/15 text-cat-cleaning",
];

function hueFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return HUES[sum % HUES.length];
}

export function Avatar({ name, photoURL, size = 40, className }: AvatarProps) {
  if (photoURL) {
    return (
      <Image
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover ring-1 ring-line", className)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold ring-1 ring-line",
        hueFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
