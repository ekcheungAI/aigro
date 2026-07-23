import { cn } from "@/lib/utils";

interface MonogramAvatarProps {
  /** Serif initials, e.g. "JL" / "EC" */
  initials: string;
  /** Expert brand color (hex, desaturated per design.md §2.5) */
  color: string;
  /** Diameter in px */
  size?: number;
  /** Verified: 1.5px gold ring replaces the brand ring (pair with VerifiedBadge overlay) */
  verified?: boolean;
  className?: string;
}

/**
 * MonogramAvatar — 領航專家字母印章頭像。
 * 唔用生成人像（fake faces）:Fraunces serif initials,
 * brand-color tinted bg(12% alpha)+ 1.5px brand ring;
 * verified 改用金環,由 call site 疊 VerifiedBadge。
 * 深淺色通用:initials 用 color-mix 混入 --text-primary,
 * 深色主題自動調亮、淺色自動加深,維持可讀對比。
 */
export default function MonogramAvatar({
  initials,
  color,
  size = 64,
  verified = false,
  className,
}: MonogramAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-display",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1F` /* brand tint 12% */,
        boxShadow: verified
          ? "inset 0 0 0 1.5px hsl(var(--gold))"
          : `inset 0 0 0 1.5px ${color}`,
        color: `color-mix(in srgb, ${color} 62%, hsl(var(--text-primary)))`,
        fontSize: Math.round(size * 0.36),
        fontWeight: 550,
        letterSpacing: "0.02em",
        lineHeight: 1,
      }}
    >
      {initials}
    </span>
  );
}
