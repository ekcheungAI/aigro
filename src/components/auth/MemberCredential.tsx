import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Fingerprint } from "lucide-react";
import AvatarEditor from "@/components/auth/AvatarEditor";
import type { AigroMember } from "@/components/auth/member";
import {
  hasFullPlatformAccess,
  ROLE_LABELS,
} from "@/components/auth/member";
import {
  memberCredentialId,
  memberCredentialIssuedLabel,
} from "@/components/auth/memberCredentialData";

interface MemberCredentialProps {
  member: AigroMember;
  completion: number;
  adminPath?: "/admin" | null;
  onAvatarNotice?: (message: string) => void;
}

export default function MemberCredential({
  member,
  completion,
  adminPath,
  onAvatarNotice = () => undefined,
}: MemberCredentialProps) {
  const owner = hasFullPlatformAccess(member);
  const plan = owner
    ? "全平台存取"
    : member.tier === "vip"
      ? "VIP 方案"
      : member.tier === "pro"
        ? "Pro 方案"
        : "Free 方案";

  return (
    <article
      aria-label="AIGRO 會員身份認證"
      className="relative overflow-hidden rounded-md border border-border-strong bg-surface"
    >
      <div className="h-0.5 bg-lime" />
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.65fr)]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-text-muted">
              AIGRO Member Credential
            </p>
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-ink">
              <BadgeCheck className="h-4 w-4" strokeWidth={1.8} />
              會員帳戶已驗證
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
            <AvatarEditor member={member} onNotice={onAvatarNotice} />
            <div className="min-w-0">
              <p className="text-caption text-text-muted">香港會員身份認證</p>
              <h1
                id="member-credential-title"
                className="mt-1 text-balance font-display text-h2 font-semibold tracking-tight text-text-primary sm:text-display"
              >
                {member.name}
              </h1>
              <p className="mt-1 truncate text-body-sm text-text-secondary">{member.email}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-sm border border-border-strong bg-lime-soft px-3 py-1.5 text-label text-ink">
                  {ROLE_LABELS[member.role]}
                </span>
                <span className="rounded-sm border border-border-strong px-3 py-1.5 text-caption text-text-secondary">
                  {plan}
                </span>
              </div>
            </div>
          </div>

          <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-caption text-text-muted">加入日期</dt>
              <dd className="mt-1 text-label text-text-primary">
                {memberCredentialIssuedLabel(member.joinedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">檔案狀態</dt>
              <dd className="mt-1 font-mono text-label tabular-nums text-text-primary">
                {completion}% 完成
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-caption text-text-muted">會員狀態</dt>
              <dd className="mt-1 text-label text-ink">Active 有效</dd>
            </div>
          </dl>
        </div>

        <aside className="flex flex-col justify-between border-t bg-card p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-sm border border-border-strong bg-surface text-text-primary">
              <Fingerprint className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="mt-6 text-caption text-text-muted">Credential ID</p>
            <p className="mt-1 break-all font-mono text-label tracking-[0.08em] text-text-primary">
              {memberCredentialId(member.email)}
            </p>
            <p className="mt-5 max-w-[30ch] text-caption leading-relaxed text-text-muted">
              此認證代表 AIGRO 會員身份，並非專業資格或牌照。
            </p>
          </div>

          {adminPath ? (
            <Link
              to={adminPath}
              className="press mt-8 inline-flex h-11 items-center justify-between rounded-md bg-ink-solid px-4 text-label text-on-accent"
            >
              管理平台
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          ) : member.tier !== "vip" ? (
            <Link
              to="/pricing"
              className="press mt-8 inline-flex h-11 items-center justify-between rounded-md border border-border-strong bg-surface px-4 text-label text-text-primary hover:border-ink"
            >
              查看會員權益
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
