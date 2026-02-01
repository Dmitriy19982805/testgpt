import { useMemo } from "react";
import { addDays, isSameDay } from "date-fns";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { StatPill } from "../../components/common/StatPill";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../store/useAppStore";
import { formatDate } from "../../utils/date";

export function DashboardPage() {
  const { orders, customers } = useAppStore();

  const today = new Date();
  const upcoming = useMemo(
    () =>
      orders.filter((order) =>
        isSameDay(new Date(order.dueAt), addDays(today, 1))
      ),
    [orders, today]
  );

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [orders]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Today’s production rhythm, alerts, and upcoming orders."
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label="orders" value={String(statusCounts.total)} />
        <StatPill label="customers" value={String(customers.length)} />
        <StatPill label="confirmed" value={String(statusCounts.confirmed ?? 0)} />
        <StatPill label="ready" value={String(statusCounts.ready ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold">Today’s focus</h2>
          <div className="mt-4 space-y-4">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500">
                No orders yet. Seed the demo in settings to explore a filled
                workspace.
              </p>
            ) : (
              orders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 text-sm dark:border-slate-800/60 dark:bg-slate-900/60"
                >
                  <div>
                    <p className="font-medium">{order.orderNo}</p>
                    <p className="text-xs text-slate-500">
                      Due {formatDate(order.dueAt)}
                    </p>
                  </div>
                  <Badge tone={order.status === "confirmed" ? "info" : "default"}>
                    {order.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold">Alerts</h2>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">
                No due-tomorrow orders. Everything is on schedule.
              </p>
            ) : (
              upcoming.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-2xl bg-amber-100/70 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
                >
                  <span>{order.orderNo} due tomorrow</span>
                  <span className="text-xs">Deposit check</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
