import { cn } from "@/lib/utils";
import HongKongAvatar from "@/components/auth/HongKongAvatar";
import { avatarPresetIndex } from "@/components/auth/memberAvatarPreferences";

interface MemberAvatarProps {
  member: {
    name: string;
    email: string;
    avatarSeed?: string;
    avatarUrl?: string;
  };
  size?: number;
  className?: string;
}

/** Local Hong Kong avatar, or the member's uploaded display picture. */
export default function MemberAvatar({
  member,
  size = 32,
  className,
}: MemberAvatarProps) {
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={`${member.name} 個人頭像`}
        className={cn(
          "shrink-0 rounded-full border border-border-strong bg-surface object-cover",
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <HongKongAvatar
      index={avatarPresetIndex(member.avatarSeed, member.email)}
      name={member.name}
      size={size}
      className={className}
    />
  );
}
