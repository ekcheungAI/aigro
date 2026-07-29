import { cn } from "@/lib/utils";

interface PlatformDpProps {
  /** 邊長(px),正方形輸出 */
  size?: number;
  className?: string;
}

/**
 * 平台編輯部 AI 分身頭像 — 雷達 A 黑碟(/editorial/platform-dp.png)。
 * 圓形 cover + 1.5px lime ring;只限 platform 分身使用,
 * 專家分身繼續用 PhotoAvatar / MonogramAvatar。
 */
export default function PlatformDp({ size = 32, className }: PlatformDpProps) {
  return (
    <img
      src="/editorial/platform-dp.png"
      alt="平台編輯部 AI 分身頭像"
      width={size}
      height={size}
      className={cn(
        "shrink-0 rounded-full object-cover ring-[1.5px] ring-[hsl(var(--lime))]",
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
