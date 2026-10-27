"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartColumn,
  ChefHat,
  ClipboardList,
  ExternalLink,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  QrCode,
  Settings,
  ShoppingBag,
  ShoppingBasket,
  UserCog,
  Utensils,
  X,
} from "lucide-react";
import { canAccess } from "@/lib/permissions";
import { ExpensesManager } from "./expenses-manager";
import { KitchenDisplay } from "./kitchen-display";
import { MenuManager } from "./menu-manager";
import { OrdersManager } from "./orders-manager";
import { OrderAlerts } from "./order-alerts";
import { Overview } from "./overview";
import { QrManager } from "./qr-manager";
import { Reports } from "./reports";
import { StaffManager } from "./staff-manager";
import { TablesManager } from "./tables-manager";
import { WaiterPanel } from "./waiter-panel";

export type AdminUser = { id: string; name: string; email: string; role: string };

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Orders", icon: ClipboardList },
  { label: "Tables", icon: Grid2X2 },
  { label: "Menu", icon: Utensils },
  { label: "Kitchen display", icon: ChefHat },
  { label: "Reports", icon: ChartColumn },
  { label: "Expenses", icon: ShoppingBasket },
];
const secondaryItems = [
  { label: "Waiter order panel", icon: ShoppingBag },
  { label: "QR ordering", icon: QrCode },
  { label: "Staff", icon: UserCog },
  { label: "Settings", icon: Settings },
];

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboard({ user }: { user: AdminUser }) {
  const router = useRouter();
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
  const [active, setActive] = useState(() => [...mainItems, ...operationItems][0]?.label ?? "Kitchen display");
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
      <ComingSoon title={active} />
    ) : active === "Overview" ? (
      <Overview onNavigate={setActive} />
    ) : active === "Orders" ? (
      <OrdersManager />
    ) : active === "Tables" ? (
      <TablesManager />
    ) : active === "Menu" ? (
      <MenuManager />
    ) : active === "Kitchen display" ? (
      <KitchenDisplay />
    ) : active === "Waiter order panel" ? (
      <WaiterPanel />
    ) : active === "QR ordering" ? (
      <QrManager onGoToTables={() => setActive("Tables")} />
    ) : active === "Reports" ? (
      <Reports />
    ) : active === "Expenses" ? (
      <ExpensesManager />
    ) : active === "Staff" ? (
      <StaffManager currentUserId={user.id} />
    ) : (
      <ComingSoon title={active} />
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
              Restaurant &amp; Tea Stall
            </p>
          </div>
          <button
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
            className="ml-auto lg:hidden"
          >
            <X />
          </button>
        </div>
        <div className="mt-9 flex flex-1 flex-col gap-7">
          <NavGroup
            label="Main menu"
            items={mainItems}
            active={active}
            setActive={selectNav}
          />
          <NavGroup
            label="Operations"
            items={operationItems}
            active={active}
            setActive={selectNav}
          />
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-2xl bg-[#f0f5f0] p-3.5 text-xs font-semibold text-[#174d3c] hover:bg-[#e6efe7]"
        >
          <ExternalLink className="size-4" /> Open customer menu
        </a>
        <div className="mt-4 flex items-center gap-3 border-t border-[#e8ece7] px-2 pt-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#ead8b6] text-xs font-bold text-[#714b17]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user.name}</p>
            <p className="text-[11px] capitalize text-[#8a948b]">{user.role}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="rounded-lg p-1.5 text-[#9aa39b] hover:bg-[#f5f7f4] hover:text-[#b4472c]"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[#e6eae4] bg-[#f7f8f6]/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
              className="lg:hidden"
            >
              <PanelLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#89938b]">
                {now
                  ? now.toLocaleDateString([], {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : " "}
              </p>
              <h1 className="truncate font-serif text-xl font-bold tracking-tight">
                {now ? greeting(now.getHours()) : "Hello"},{" "}
                {user.name.split(" ")[0]}
                <span className="text-[#c48545]">.</span>
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3"><OrderAlerts userName={user.name} ordersOpen={active === 'Orders' || active === 'Kitchen display'} onOpenOrders={() => setActive(canAccess(user.role, 'Orders') ? 'Orders' : 'Kitchen display')} />
            <div className="hidden items-center gap-2 rounded-full border border-[#e0e5df] bg-white py-1.5 pl-1.5 pr-3 sm:flex">
              <div className="flex size-7 items-center justify-center rounded-full bg-[#ead8b6] text-[10px] font-bold text-[#714b17]">
                {initials}
              </div>
              <span className="text-xs font-semibold">{user.name}</span>
              <span className="rounded-full bg-[#eaf2eb] px-1.5 py-0.5 text-[10px] font-semibold capitalize text-[#174d3c]">
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="flex size-9 items-center justify-center rounded-full border border-[#e0e5df] bg-white text-[#68756b] hover:text-[#b4472c]"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] p-5 sm:p-8">{content}</div>
      </main>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">
        {title}
      </p>
      <h2 className="font-serif text-3xl font-bold tracking-tight">
        Coming soon
      </h2>
      <p className="mt-3 max-w-md text-sm text-[#68756b]">
        This section isn&apos;t built yet. Orders, kitchen display, tables,
        menu, the waiter panel and QR codes are ready to use.
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
  items: { label: string; icon: typeof LayoutDashboard }[];
  active: string;
  setActive: (label: string) => void;
}) {
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
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
