import { cn } from "@/lib/utils";

interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Category chip (design.md §6.7):
 * overline type, ink-soft bg + ink text, radius-sm, 6px 12px padding.
 * Active: solid ink bg + white text. Hover (non-active): ink border.
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
        "inline-flex items-center rounded-sm border px-3 py-1.5 text-overline font-sans uppercase transition-colors duration-150",
        active
          ? "border-transparent bg-ink-solid text-white dark:text-white"
          : "border-transparent bg-ink-soft text-ink hover:border-ink",
        className
      )}
    >
      {label}
    </button>
  );
}
