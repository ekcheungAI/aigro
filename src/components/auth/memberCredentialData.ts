export function memberCredentialId(email: string): string {
  let hash = 2166136261;
  for (const character of email.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const reference = (hash >>> 0).toString(36).toUpperCase().padStart(8, "0").slice(-8);
  return `AIGRO-HK-${reference}`;
}

export function memberCredentialIssuedLabel(joinedAt: number): string {
  const parts = new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "numeric",
    timeZone: "Asia/Hong_Kong",
  }).formatToParts(new Date(joinedAt));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year} 年 ${month} 月`;
}
