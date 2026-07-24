import { cn } from "@/lib/utils";

interface AdminToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/** Admin 通用 toggle — lime = 開,disabled = 淡化 */
export default function AdminToggle({
  checked,
  onChange,
  disabled = false,
  label,
}: AdminToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? "切換"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
        checked ? "border-lime bg-lime" : "border-border-strong bg-card",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-200",
          checked ? "left-[22px] bg-on-accent" : "left-[3px] bg-text-muted"
        )}
      />
    </button>
  );
}
