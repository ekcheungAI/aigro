export interface PrimaryNavigationLink {
  to: string;
  en: string;
  zh: string;
  comingSoon?: boolean;
  activePaths?: readonly string[];
}

export const CLASS_REVIEW_NAV_LINK = {
  to: "/class-review",
  en: "Class Review",
  zh: "課堂重溫",
  activePaths: ["/class-review", "/guides/"],
} as const satisfies PrimaryNavigationLink;

export const PRIMARY_NAVIGATION_LINKS = [
  { to: "/insights", en: "Insights", zh: "情報" },
  CLASS_REVIEW_NAV_LINK,
  { to: "/skills", en: "Skills", zh: "技能" },
  { to: "/experts", en: "Experts", zh: "專家", comingSoon: true },
  { to: "/ask", en: "Ask", zh: "問答", comingSoon: true },
] as const satisfies readonly PrimaryNavigationLink[];

export function isPrimaryNavigationActive(
  pathname: string,
  link: PrimaryNavigationLink
): boolean {
  const normalizedPathname = pathname.replace(/\/$/, "") || "/";
  const paths = link.activePaths ?? [link.to];

  return paths.some((path) => {
    const normalizedPath = path.replace(/\/$/, "") || "/";
    return normalizedPathname === normalizedPath || normalizedPathname.startsWith(`${normalizedPath}/`);
  });
}
