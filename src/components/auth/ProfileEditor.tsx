import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import Field from "@/components/auth/Field";
import {
  GOAL_OPTIONS,
  REFERRAL_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from "@/components/auth/member";
import type {
  AigroMember,
  MemberNotifications,
  ReferralSource,
  TeamSize,
} from "@/components/auth/member";
import { cn } from "@/lib/utils";

interface ProfileEditorProps {
  member: AigroMember;
  onSave: (next: AigroMember) => void;
  onCancel: () => void;
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T | "";
  onChange: (v: T | "") => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}

/** Select 欄位 — 規格跟 Field input(48px、border-strong、focus ring-ink-soft) */
function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "未選擇",
}: SelectFieldProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-text-primary">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T | "")}
          className={cn(
            "h-12 w-full appearance-none rounded-md border border-border-strong bg-surface px-4 pr-10 text-body transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:border-ink focus:ring-ink-soft",
            value ? "text-text-primary" : "text-text-muted"
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}

/** 通知 switch — 跟 Account 設定同款(h-6 w-11、lime fill) */
function NotifySwitch({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="flex-1">
        <p className="text-label text-text-primary">{label}</p>
        <p className="mt-0.5 text-caption text-text-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          "press relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150",
          on ? "bg-lime" : "bg-border-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-[left] duration-150",
            on ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SectionLegend({ children }: { children: string }) {
  return (
    <legend className="text-overline uppercase tracking-[0.12em] text-text-muted">
      {children}
    </legend>
  );
}

/**
 * 「完善檔案」inline 編輯表單(v1.20)— 三個 section:
 * 基本(name / city / roleTitle)· 工作(company / teamSize / goals)
 * · 聯絡與偏好(social / referral / 通知 toggles)。
 * 儲存 → onSave(由 Account 負責 saveMember + toast + 里程碑偵測)。
 */
export default function ProfileEditor({
  member,
  onSave,
  onCancel,
}: ProfileEditorProps) {
  const [name, setName] = useState(member.name);
  const [city, setCity] = useState(member.city ?? "香港");
  const [roleTitle, setRoleTitle] = useState(member.roleTitle ?? "");
  const [company, setCompany] = useState(member.company ?? "");
  const [teamSize, setTeamSize] = useState<TeamSize | "">(member.teamSize ?? "");
  const [goals, setGoals] = useState<string[]>(member.goals ?? []);
  const [social, setSocial] = useState(member.social ?? "");
  const [referral, setReferral] = useState<ReferralSource | "">(
    member.referral ?? ""
  );
  const [notifications, setNotifications] = useState<MemberNotifications>({
    ...member.notifications,
  });
  const [nameError, setNameError] = useState<string | null>(null);

  const toggleGoal = (g: string) =>
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  const toggleNotification = (key: keyof MemberNotifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("名稱唔可以留空");
      return;
    }
    const next: AigroMember = {
      ...member,
      name: trimmed,
      city: city.trim() || undefined,
      roleTitle: roleTitle.trim() || undefined,
      company: company.trim() || undefined,
      teamSize: teamSize || undefined,
      goals: goals.length > 0 ? goals : undefined,
      social: social.trim() || undefined,
      referral: referral || undefined,
      notifications,
    };
    onSave(next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-8"
    >
      {/* ---- 基本 ---- */}
      <fieldset className="flex flex-col gap-5">
        <SectionLegend>基本</SectionLegend>
        <Field
          id="pe-name"
          label="名稱"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          error={nameError}
          autoComplete="name"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="pe-city"
            label="城市"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="香港"
            hint="預設香港"
            autoComplete="address-level2"
          />
          <Field
            id="pe-role-title"
            label="職位"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="例如 Growth Lead"
            autoComplete="organization-title"
          />
        </div>
      </fieldset>

      {/* ---- 工作 ---- */}
      <fieldset className="flex flex-col gap-5">
        <SectionLegend>工作</SectionLegend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="pe-company"
            label="公司/團隊"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="例如 AIGRO Studio"
            autoComplete="organization"
          />
          <SelectField<TeamSize>
            id="pe-team-size"
            label="團隊規模"
            value={teamSize}
            onChange={setTeamSize}
            options={TEAM_SIZE_OPTIONS}
          />
        </div>
        <div>
          <p className="text-label text-text-primary">想達成嘅目標(可揀多個)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => {
              const on = goals.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleGoal(g)}
                  className={cn(
                    "press inline-flex h-10 items-center rounded-full border px-4 text-label",
                    on
                      ? "border-transparent bg-lime-soft text-ink"
                      : "border-border-strong text-text-secondary hover:text-text-primary"
                  )}
                >
                  {on && (
                    <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      {/* ---- 聯絡與偏好 ---- */}
      <fieldset className="flex flex-col gap-5">
        <SectionLegend>聯絡與偏好</SectionLegend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="pe-social"
            label="主要社交平台 handle"
            value={social}
            onChange={(e) => setSocial(e.target.value)}
            placeholder="例如 @aigro.hk"
          />
          <SelectField<ReferralSource>
            id="pe-referral"
            label="點知我哋"
            value={referral}
            onChange={setReferral}
            options={REFERRAL_OPTIONS}
          />
        </div>
        <div className="flex flex-col gap-3">
          <NotifySwitch
            label="每日情報摘要"
            desc="每日 5 條精選,朝早 8 點送上"
            on={notifications.daily}
            onToggle={() => toggleNotification("daily")}
          />
          <NotifySwitch
            label="每週精選 Newsletter"
            desc="編輯部一週深度回顧"
            on={notifications.weekly}
            onToggle={() => toggleNotification("weekly")}
          />
          <NotifySwitch
            label="產品更新"
            desc="新功能與 MCP Network 動向"
            on={notifications.product}
            onToggle={() => toggleNotification("product")}
          />
        </div>
      </fieldset>

      {/* ---- 操作 ---- */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="press inline-flex h-12 items-center rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover"
        >
          儲存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="press inline-flex h-12 items-center rounded-md border border-border-strong px-6 text-label text-text-primary hover:border-ink hover:text-ink"
        >
          取消
        </button>
      </div>
    </form>
  );
}
