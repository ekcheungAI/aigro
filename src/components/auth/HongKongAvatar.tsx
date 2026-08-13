import type { LucideIcon } from "lucide-react";
import {
  CakeSlice,
  Coffee,
  CookingPot,
  Flag,
  Flower2,
  Mountain,
  Ship,
  TramFront,
} from "lucide-react";
import { HONG_KONG_AVATAR_PRESETS } from "@/components/auth/memberAvatarPreferences";
import { cn } from "@/lib/utils";

const ICONS: LucideIcon[] = [
  TramFront,
  Coffee,
  CookingPot,
  Ship,
  Mountain,
  Flower2,
  CakeSlice,
  Flag,
];

const TREATMENTS = [
  "bg-lime-soft text-text-primary",
  "bg-ink-solid text-on-accent",
  "bg-surface text-text-primary",
  "bg-lime-soft text-ink",
] as const;

interface HongKongAvatarProps {
  index: number;
  name: string;
  size: number;
  className?: string;
}

export default function HongKongAvatar({ index, name, size, className }: HongKongAvatarProps) {
  const safeIndex = index % HONG_KONG_AVATAR_PRESETS.length;
  const preset = HONG_KONG_AVATAR_PRESETS[safeIndex];
  const Icon = ICONS[safeIndex];

  return (
    <span
      role="img"
      aria-label={`${name} 個人頭像：${preset.label}`}
      title={preset.label}
      data-avatar-variant={`hk-${preset.id}`}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-border-strong",
        TREATMENTS[safeIndex % TREATMENTS.length],
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 h-[18%]",
          safeIndex % 2 === 0 ? "bg-lime" : "bg-surface/20"
        )}
      />
      <Icon
        aria-hidden="true"
        className="relative"
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={1.8}
      />
    </span>
  );
}
