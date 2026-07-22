import { cn } from "@/lib/utils";

type BadgeSize = 16 | 24 | 40;

interface VerifiedBadgeProps {
  size?: BadgeSize;
  /** Enable 8s ambient sheen loop (stagger via sheenDelaySec, design.md §5.3) */
  ambient?: boolean;
  /** Ambient loop start delay, seconds — stagger badges 200ms apart */
  sheenDelaySec?: number;
  className?: string;
}

/**
 * Verified Badge「金印」Direction A (design.md §6.4):
 * 1.5px gold ring + solid ink disc + negative-space check (surface color).
 * Sizes: 16 (inline list) / 24 (avatar corner) / 40 (expert hero).
 * Sheen: 30° highlight sweep, 900ms, hover or 8s ambient loop — stays
 * inside the ring via border-radius mask.
 */
export default function VerifiedBadge({
  size = 24,
  ambient = false,
  sheenDelaySec = 0,
  className,
}: VerifiedBadgeProps) {
  const px = size;
  return (
    <span
      role="img"
      aria-label="已認證導師 Verified mentor"
      className={cn(
        "badge-sheen inline-flex shrink-0 items-center justify-center rounded-full",
        ambient && "badge-sheen-ambient",
        className
      )}
      style={
        {
          width: px,
          height: px,
          boxShadow: `inset 0 0 0 1.5px hsl(var(--gold))`,
          backgroundColor: "hsl(var(--ink-solid))",
          "--sheen-delay": `${2 + sheenDelaySec}s`,
        } as React.CSSProperties
      }
    >
      {/* negative-space check, surface color, ~6×6 at 24px */}
      <svg
        width={px * 0.5}
        height={px * 0.5}
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2.5 6.2 5 8.7 9.5 3.5"
          stroke="hsl(var(--surface))"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
