import { useRef, useState } from "react";
import { Camera, Check, ImageUp } from "lucide-react";
import MemberAvatar from "@/components/auth/MemberAvatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AVATAR_BUCKET,
  AVATAR_PRESET_COUNT,
  HONG_KONG_AVATAR_PRESETS,
  avatarObjectPath,
  avatarPresetIndex,
  avatarPresetSeed,
  validateAvatarFile,
  versionedAvatarUrl,
} from "@/components/auth/memberAvatarPreferences";
import { saveMember } from "@/components/auth/member";
import type { AigroMember } from "@/components/auth/member";
import { supabase, supabaseReady } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AvatarEditorProps {
  member: AigroMember;
  onNotice: (message: string) => void;
}

export default function AvatarEditor({ member, onNotice }: AvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const updateProfile = async (
    fields: Pick<AigroMember, "avatarSeed" | "avatarPath" | "avatarUpdatedAt">
  ): Promise<boolean> => {
    if (!supabase || !supabaseReady || member.demo) return true;
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      onNotice("登入狀態已失效，請重新登入後再試。");
      return false;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_seed: fields.avatarSeed ?? null,
        avatar_path: fields.avatarPath ?? null,
        avatar_updated_at: fields.avatarUpdatedAt ?? null,
      })
      .eq("id", data.user.id);
    if (error) {
      onNotice(`未能更新個人頭像：${error.message}`);
      return false;
    }
    return true;
  };

  const choosePreset = async (index: number) => {
    if (busy) return;
    setBusy(true);
    const avatarSeed = avatarPresetSeed(member.email, index);
    const nextFields = { avatarSeed, avatarPath: undefined, avatarUpdatedAt: undefined };
    const updated = await updateProfile(nextFields);
    if (updated) {
      saveMember({ ...member, ...nextFields, avatarUrl: undefined });
      onNotice("個人頭像已更新");
      setOpen(false);
    }
    setBusy(false);
  };

  const uploadPicture = async (file: File) => {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      onNotice(validationError);
      return;
    }
    if (!supabase || !supabaseReady || member.demo) {
      onNotice("上載相片需要登入正式會員帳戶。");
      return;
    }

    setBusy(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw new Error("登入狀態已失效，請重新登入後再試。");

      const avatarPath = avatarObjectPath(data.user.id);
      const avatarUpdatedAt = new Date().toISOString();
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_seed: null,
          avatar_path: avatarPath,
          avatar_updated_at: avatarUpdatedAt,
        })
        .eq("id", data.user.id);
      if (profileError) throw profileError;

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
      saveMember({
        ...member,
        avatarSeed: undefined,
        avatarPath,
        avatarUpdatedAt,
        avatarUrl: versionedAvatarUrl(publicData.publicUrl, avatarUpdatedAt),
      });
      onNotice("顯示相片已上載");
      setOpen(false);
    } catch (caught) {
      onNotice(caught instanceof Error ? `上載失敗：${caught.message}` : "上載失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="更新個人頭像"
          className="press group relative w-fit self-start shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <MemberAvatar member={member} size={96} />
          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border border-surface bg-ink-solid text-on-accent">
            <Camera className="h-4 w-4" strokeWidth={1.5} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        collisionPadding={16}
        role="dialog"
        aria-label="更新個人頭像"
        className="w-[min(22rem,calc(100vw-2rem))] border-border-strong bg-surface p-4 shadow-card motion-reduce:!animate-none dark:shadow-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-text-primary">更新個人頭像</p>
            <p className="mt-1 text-caption text-text-muted">選擇香港主題，或上載相片。</p>
          </div>
          <span className="text-caption text-text-muted">最多 2 MB</span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4">
          {Array.from({ length: AVATAR_PRESET_COUNT }, (_, index) => {
            const seed = avatarPresetSeed(member.email, index);
            const selected = !member.avatarUrl && avatarPresetIndex(member.avatarSeed, member.email) === index;
            const preset = HONG_KONG_AVATAR_PRESETS[index];
            return (
              <button
                key={seed}
                type="button"
                disabled={busy}
                onClick={() => void choosePreset(index)}
                aria-label={`選擇${preset.label}頭像`}
                aria-pressed={selected}
                className={cn(
                  "press relative flex min-w-0 flex-col items-center gap-1.5 rounded-md border px-1 py-2 transition-colors duration-180 disabled:cursor-wait disabled:opacity-55",
                  selected
                    ? "border-ink bg-lime-soft text-text-primary"
                    : "border-transparent bg-transparent text-text-muted hover:border-border-strong hover:bg-card"
                )}
              >
                <MemberAvatar member={{ ...member, avatarSeed: seed, avatarUrl: undefined }} size={42} />
                {selected && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-solid text-on-accent">
                    <Check className="h-3 w-3" strokeWidth={2} />
                  </span>
                )}
                <span className="text-center text-caption leading-tight">{preset.label}</span>
              </button>
            );
          })}
        </div>

        <label
          className={cn(
            "press mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border-strong text-label text-text-primary hover:border-ink hover:text-ink",
            busy && "pointer-events-none opacity-55"
          )}
        >
          <ImageUp className="h-4 w-4" strokeWidth={1.5} />
          {busy ? "處理中…" : "上載相片"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPicture(file);
              event.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 text-center text-caption text-text-muted">JPG、PNG 或 WebP</p>
      </PopoverContent>
    </Popover>
  );
}
