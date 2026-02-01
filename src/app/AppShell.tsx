import { NavLink, Outlet } from "react-router-dom";
import { Home, Notebook, Users, CakeSlice, Package, Wallet, Settings } from "lucide-react";
import { cn } from "../components/ui/utils";
import { t } from "../i18n";

interface AppShellProps {
  auth: { logout: () => void };
}

const navItems = [
  { to: "/app/dashboard", label: t.nav.dashboard, icon: Home },
  { to: "/app/orders", label: t.nav.orders, icon: Notebook },
  { to: "/app/customers", label: t.nav.customers, icon: Users },
  { to: "/app/recipes", label: t.nav.recipes, icon: CakeSlice },
  { to: "/app/ingredients", label: t.nav.ingredients, icon: Package },
  { to: "/app/finance", label: t.nav.finance, icon: Wallet },
  { to: "/app/settings", label: t.nav.settings, icon: Settings },
];

export function AppShell({ auth }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 dark:bg-slate-950/90">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 flex-col border-r border-slate-200/60 bg-white/70 px-5 py-8 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/70 md:flex">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">{t.appShell.cabinet}</p>
              <h2 className="text-xl font-semibold">{t.appShell.confectioner}</h2>
            </div>
          </div>
          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={auth.logout}
            className="mt-auto rounded-2xl border border-slate-200/70 px-4 py-3 text-sm text-slate-500 transition hover:bg-slate-100 dark:border-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t.appShell.logout}
          </button>
        </aside>

        <main className="flex-1 px-4 pb-20 pt-6 md:px-10 md:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-4 left-1/2 z-40 w-[min(94vw,520px)] -translate-x-1/2 rounded-full border border-slate-200/60 bg-white/80 px-4 py-3 shadow-soft backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80 md:hidden">
        <div className="flex items-center justify-between">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 text-[11px] font-medium transition",
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
