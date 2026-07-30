import { cn } from "@/lib/utils";

interface MonogramAvatarProps {
  /** Serif initials, e.g. "JL" / "EC" */
  initials: string;
  /** Expert brand color (hex, desaturated per design.md §2.5). Ignored when `muted`. */
  color?: string;
  /** Diameter in px */
  size?: number;
  /** Verified: 1.5px lime ring replaces the brand ring (pair with VerifiedBadge overlay) */
  verified?: boolean;
  /**
   * Muted demo variant (示範分身): neutral treatment — no brand color, no lime.
   * ring = border-strong, bg = card, initials = text-secondary.
   */
  muted?: boolean;
  className?: string;
}

/**
 * MonogramAvatar — 領航專家字母印章頭像。
 * 唔用生成人像（fake faces）:Fraunces serif initials,
 * brand-color tinted bg(12% alpha)+ 1.5px brand ring;
 * verified 改用萊姆綠環,由 call site 疊 VerifiedBadge。
 * 深淺色通用:initials 用 color-mix 混入 --text-primary,
 * 深色主題自動調亮、淺色自動加深,維持可讀對比。
 */
export default function MonogramAvatar({
  initials,
  color,
  size = 64,
  verified = false,
  muted = false,
  className,
}: MonogramAvatarProps) {
  const brand = color ?? "#7C8798"; /* fallback: text-muted-ish neutral */
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
        backgroundColor: muted
          ? "hsl(var(--card))"
          : `${brand}1F` /* brand tint 12% */,
        boxShadow: verified
          ? "inset 0 0 0 1.5px hsl(var(--lime))"
          : muted
            ? "inset 0 0 0 1.5px hsl(var(--border-strong))"
            : `inset 0 0 0 1.5px ${brand}`,
        color: muted
          ? "hsl(var(--text-secondary))"
          : `color-mix(in srgb, ${brand} 62%, hsl(var(--text-primary)))`,
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

interface PhotoAvatarProps {
  /** 真實肖像 URL(public/ 路徑),如 /experts/elvin-cheung.jpg */
  src: string;
  alt: string;
  /** Diameter in px */
  size?: number;
  /** Verified: 1.5px lime ring replaces the hairline (pair with VerifiedBadge overlay) */
  verified?: boolean;
  className?: string;
}

/**
 * PhotoAvatar — 領航專家真實肖像頭像(僅有授權肖像嘅專家使用)。
 * 與 MonogramAvatar 同一視覺語言:圓形裁切、verified 1.5px 萊姆綠環、
 * call site 疊 VerifiedBadge。照片處理同 case-photo:saturate-[0.85] 基調,
 * hover 還原 saturate-100(filter transition 250ms,純 filter 無 transform,
 * touch 安全)。inset 金環用 overlay span — img 嘅 replaced content 會遮住
 * 直接落喺 <img> 上嘅 inset box-shadow。
 */
export function PhotoAvatar({
  src,
  alt,
  size = 64,
  verified = false,
  className,
}: PhotoAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover saturate-[0.85] transition-[filter] duration-250 hover:saturate-100 group-hover:saturate-100"
      />
      {verified && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px hsl(var(--lime))" }}
        />
      )}
    </span>
  );
}
