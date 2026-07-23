import { cn } from "@/lib/utils";

interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Category chip (design.md §6.7, rebranded):
 * overline type, lime-soft bg + lime-text, radius-sm, 6px 12px padding.
 * Active: solid lime bg + near-black text. Hover (non-active): lime border.
 */
export default function CategoryChip({
  label,
  active = false,
  onClick,
  className,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press inline-flex items-center rounded-sm border px-3 py-1.5 text-overline font-sans uppercase",
        active
          ? "border-transparent bg-ink-solid text-on-accent"
          : "border-transparent bg-ink-soft text-ink hover:border-ink",
        className
      )}
    >
      {label}
    </button>
  );
}
