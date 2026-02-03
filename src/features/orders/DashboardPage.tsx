import { useMemo, useState } from "react";
import { addDays, isSameDay } from "date-fns";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { StatPill } from "../../components/common/StatPill";
import { Badge } from "../../components/ui/badge";
import { useAppStore } from "../../store/useAppStore";
import { formatDate } from "../../utils/date";
import { t } from "../../i18n";
import { OrderDetailsSheet } from "./OrderDetailsSheet";
import type { Order } from "../../db/types";

export function DashboardPage() {
  const { orders, customers } = useAppStore();
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const openDetails = (order: Order) => {
    setDetailsOrder(order);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.dashboard.title}
        description={t.dashboard.description}
      />

      <div className="flex flex-wrap gap-3">
        <StatPill label={t.dashboard.stats.orders} value={String(statusCounts.total)} />
        <StatPill label={t.dashboard.stats.customers} value={String(customers.length)} />
        <StatPill label={t.dashboard.stats.confirmed} value={String(statusCounts.confirmed ?? 0)} />
        <StatPill label={t.dashboard.stats.ready} value={String(statusCounts.ready ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold">{t.dashboard.todayFocus}</h2>
          <div className="mt-4 space-y-4">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t.dashboard.noOrders}
              </p>
            ) : (
              orders.slice(0, 4).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openDetails(order)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 text-left text-sm transition hover:border-slate-300/70 hover:bg-white/90 active:scale-[0.99] dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-slate-700/70 dark:hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70"
                >
                  <div>
                    <p className="font-medium">{order.orderNo}</p>
                    <p className="text-xs text-slate-500">
                      {t.dashboard.duePrefix} {formatDate(order.dueAt)}
                    </p>
                  </div>
                  <Badge tone={order.status === "confirmed" ? "info" : "default"}>
                    {t.orders.statusLabels[order.status] ?? order.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold">{t.dashboard.alerts}</h2>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t.dashboard.noAlerts}
              </p>
            ) : (
              upcoming.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-2xl bg-amber-100/70 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
                >
                  <span>
                    {order.orderNo} {t.dashboard.dueTomorrowSuffix}
                  </span>
                  <span className="text-xs">{t.dashboard.depositCheck}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <OrderDetailsSheet
        open={detailsOpen}
        order={detailsOrder}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsOpen(false);
            setDetailsOrder(null);
          }
        }}
      />
    </div>
  );
}
