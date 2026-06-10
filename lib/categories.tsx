import {
  Zap,
  Droplets,
  Wifi,
  ShoppingBasket,
  House,
  Sparkles,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/lib/firebase/schema";

export interface CategoryMeta {
  label: string;
  Icon: LucideIcon;
  // Literal Tailwind classes (v4 scans source for full class names, so these
  // must appear verbatim — never build them by interpolation).
  text: string;
  bg: string;
  dot: string;
}

export const CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  electric: {
    label: "Electric",
    Icon: Zap,
    text: "text-cat-electric",
    bg: "bg-cat-electric/12",
    dot: "bg-cat-electric",
  },
  water: {
    label: "Water",
    Icon: Droplets,
    text: "text-cat-water",
    bg: "bg-cat-water/12",
    dot: "bg-cat-water",
  },
  internet: {
    label: "Internet",
    Icon: Wifi,
    text: "text-cat-internet",
    bg: "bg-cat-internet/12",
    dot: "bg-cat-internet",
  },
  grocery: {
    label: "Grocery",
    Icon: ShoppingBasket,
    text: "text-cat-grocery",
    bg: "bg-cat-grocery/12",
    dot: "bg-cat-grocery",
  },
  rent: {
    label: "Rent",
    Icon: House,
    text: "text-cat-rent",
    bg: "bg-cat-rent/12",
    dot: "bg-cat-rent",
  },
  cleaning: {
    label: "Cleaning",
    Icon: Sparkles,
    text: "text-cat-cleaning",
    bg: "bg-cat-cleaning/12",
    dot: "bg-cat-cleaning",
  },
  other: {
    label: "Other",
    Icon: Receipt,
    text: "text-cat-other",
    bg: "bg-cat-other/12",
    dot: "bg-cat-other",
  },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(
  ([key, meta]) => ({ key: key as ExpenseCategory, ...meta }),
);
