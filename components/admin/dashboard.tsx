"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartColumn,
  ChefHat,
  ClipboardList,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  Settings,
  SquarePen,
  ShoppingBasket,
  UserCog,
  Utensils,
  X,
} from "lucide-react";
import { useIntlLocale, useT } from "@/components/i18n-provider";
import { LanguageSwitch } from "@/components/language-switch";
import type { MessageKey, TFunction } from "@/lib/i18n";
import { canAccess, isRole } from "@/lib/permissions";
import { ExpensesManager } from "./expenses-manager";
import { IngredientsManager } from "./ingredients-manager";
import { MenuManager } from "./menu-manager";
import { OrderEntry } from "./order-entry";
import { OrdersManager } from "./orders-manager";
import { Overview } from "./overview";
import { Reports } from "./reports";
import { SectionsManager } from "./sections-manager";
import { StaffManager } from "./staff-manager";
import { TablesManager } from "./tables-manager";

export type AdminUser = { id: string; name: string; email: string; role: string };
type NavItem = { label: string; key: MessageKey; icon: typeof LayoutDashboard };

// `label` is the section ID (used for permissions and navigation); `key` is its display name.
const navItems: NavItem[] = [
  { label: "Overview", key: "nav.sections.Overview", icon: LayoutDashboard },
  { label: "New order", key: "nav.sections.New order", icon: SquarePen },
  { label: "Orders", key: "nav.sections.Orders", icon: ClipboardList },
  { label: "Reports", key: "nav.sections.Reports", icon: ChartColumn },
  { label: "Expenses", key: "nav.sections.Expenses", icon: ShoppingBasket },
];
const secondaryItems: NavItem[] = [
  { label: "Menu", key: "nav.sections.Menu", icon: Utensils },
  { label: "Sections", key: "nav.sections.Sections", icon: ChefHat },
  { label: "Ingredients", key: "nav.sections.Ingredients", icon: Package },
  { label: "Tables", key: "nav.sections.Tables", icon: Grid2X2 },
  { label: "Staff", key: "nav.sections.Staff", icon: UserCog },
  { label: "Settings", key: "nav.sections.Settings", icon: Settings },
];
const sectionKeys: Record<string, MessageKey> = Object.fromEntries([...navItems, ...secondaryItems].map((item) => [item.label, item.key]));
const sectionName = (t: TFunction, label: string) => (sectionKeys[label] ? t(sectionKeys[label]) : label);
const ROLE_KEY = {
  admin: "staff.roles.admin.label",
  manager: "staff.roles.manager.label",
  partner: "staff.roles.partner.label",
} as const;

function greeting(t: TFunction, hour: number) {
  if (hour < 12) return t("nav.goodMorning");
  if (hour < 17) return t("nav.goodAfternoon");
  return t("nav.goodEvening");
}

export function AdminDashboard({ user }: { user: AdminUser }) {
  const router = useRouter();
  const t = useT();
  const intlLocale = useIntlLocale();
  const roleName = isRole(user.role) ? t(ROLE_KEY[user.role]) : user.role;
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };
  // Each role only sees the sections it is allowed to open; the APIs enforce the same rules.
  const mainItems = navItems.filter((item) => canAccess(user.role, item.label));
  const operationItems = secondaryItems.filter((item) => canAccess(user.role, item.label));
  const [active, setActive] = useState(() => [...mainItems, ...operationItems][0]?.label ?? "Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const selectNav = (label: string) => {
    setActive(label);
    setMobileNav(false);
  };

  // Date and greeting use the viewer's clock, so they are set after mount to avoid a server/client mismatch.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const content =
    !canAccess(user.role, active) ? (
      <ComingSoon title={sectionName(t, active)} />
    ) : active === "Overview" ? (
      <Overview onNavigate={setActive} canOpen={(section) => canAccess(user.role, section)} />
    ) : active === "New order" ? (
      <OrderEntry />
    ) : active === "Orders" ? (
      <OrdersManager onNewOrder={() => setActive("New order")} />
    ) : active === "Tables" ? (
      <TablesManager />
    ) : active === "Menu" ? (
      <MenuManager />
    ) : active === "Sections" ? (
      <SectionsManager />
    ) : active === "Ingredients" ? (
      <IngredientsManager />
    ) : active === "Reports" ? (
      <Reports />
    ) : active === "Expenses" ? (
      <ExpensesManager />
    ) : active === "Staff" ? (
      <StaffManager currentUserId={user.id} />
    ) : (
      <ComingSoon title={sectionName(t, active)} />
    );

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#202521]">
      <aside
        className={`${mobileNav ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#e4e8e2] bg-white px-4 py-5 transition-transform lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#174d3c] text-white">
            <Utensils />
          </div>
          <div>
            <p className="font-serif text-[17px] font-bold tracking-tight"></p>
            <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[.08em] text-[#849087]">
              {t("nav.tagline")}
            </p>
          </div>
          <button
            onClick={() => setMobileNav(false)}
            aria-label={t("nav.closeMenu")}
            className="ml-auto lg:hidden"
          >
            <X />
          </button>
        </div>
        <div className="mt-9 flex flex-1 flex-col gap-7">
          <NavGroup
            label={t("nav.mainMenu")}
            items={mainItems}
            active={active}
            setActive={selectNav}
          />
          <NavGroup
            label={t("nav.operations")}
            items={operationItems}
            active={active}
            setActive={selectNav}
          />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-[#e8ece7] px-2 pt-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#ead8b6] text-xs font-bold text-[#714b17]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user.name}</p>
            <p className="text-[11px] capitalize text-[#8a948b]">{roleName}</p>
          </div>
          <button
            onClick={logout}
            aria-label={t("nav.logOut")}
            title={t("nav.logOut")}
            className="rounded-lg p-1.5 text-[#9aa39b] hover:bg-[#f5f7f4] hover:text-[#b4472c]"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label={t("nav.closeNavigation")}
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[#e6eae4] bg-[#f7f8f6]/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#89938b]">
                {now
                  ? now.toLocaleDateString(intlLocale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : " "}
              </p>
              <h1 className="truncate font-serif text-lg font-bold tracking-tight sm:text-xl">
                {now ? greeting(t, now.getHours()) : t("nav.hello")},{" "}
                {user.name.split(" ")[0]}
                <span className="text-[#c48545]">.</span>
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitch />
            <div className="hidden items-center gap-2 rounded-full border border-[#e0e5df] bg-white py-1.5 pl-1.5 pr-3 sm:flex">
              <div className="flex size-7 items-center justify-center rounded-full bg-[#ead8b6] text-[10px] font-bold text-[#714b17]">
                {initials}
              </div>
              <span className="text-xs font-semibold">{user.name}</span>
              <span className="rounded-full bg-[#eaf2eb] px-1.5 py-0.5 text-[10px] font-semibold capitalize text-[#174d3c]">
                {roleName}
              </span>
            </div>
            <button
              onClick={logout}
              aria-label={t("nav.logOut")}
              title={t("nav.logOut")}
              className="hidden size-9 items-center justify-center rounded-full border border-[#e0e5df] bg-white text-[#68756b] hover:text-[#b4472c] sm:flex"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] p-5 pb-24 sm:p-8 sm:pb-24 lg:pb-8">{content}</div>
      </main>
      <button
        onClick={() => setMobileNav((open) => !open)}
        aria-label={mobileNav ? t("nav.closeMenu") : t("nav.openMenu")}
        aria-expanded={mobileNav}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[35] flex size-14 items-center justify-center rounded-full bg-[#174d3c] text-white shadow-xl lg:hidden"
      >
        {mobileNav ? <X className="size-6" /> : <PanelLeft className="size-6" />}
      </button>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  const t = useT();
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">
        {title}
      </p>
      <h2 className="font-serif text-3xl font-bold tracking-tight">
        {t("nav.comingSoon")}
      </h2>
      <p className="mt-3 max-w-md text-sm text-[#68756b]">
        {t("nav.comingSoonText")}
      </p>
    </div>
  );
}

function NavGroup({
  label,
  items,
  active,
  setActive,
}: {
  label: string;
  items: NavItem[];
  active: string;
  setActive: (label: string) => void;
}) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#a3aca5]">
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${active === item.label ? "bg-[#eaf2eb] text-[#174d3c]" : "text-[#7d897f] hover:bg-[#f5f7f4]"}`}
            >
              <Icon className="size-[17px]" />{" "}
              <span className="flex-1">{t(item.key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
