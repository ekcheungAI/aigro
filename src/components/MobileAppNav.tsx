import { BookOpen, House, MessageSquare, Newspaper } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "首頁", icon: House, end: true },
  { to: "/insights", label: "情報", icon: Newspaper },
  { to: "/skills", label: "技能", icon: BookOpen },
  { to: "/ask", label: "問答", icon: MessageSquare },
] as const;

export default function MobileAppNav() {
  return (
    <nav
      aria-label="手機應用程式導航"
      className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-4 border-t bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : undefined}
            className={({ isActive }) =>
              cn(
                "press relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 text-[10px] leading-none",
                isActive ? "text-ink" : "text-text-muted"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-5 top-0 h-0.5 bg-ink transition-transform duration-180",
                    isActive ? "scale-x-100" : "scale-x-0"
                  )}
                />
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
