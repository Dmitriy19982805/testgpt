import { useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { t } from "../../i18n";
import { DrawerSheet } from "../../components/common/DrawerSheet";
import { OrderForm } from "../orders/OrderForm";
import type { Order } from "../../db/types";

const periodFilters = ["currentMonth", "allTime"] as const;
type PeriodFilter = (typeof periodFilters)[number];

export function FinancePage() {
  const { orders, settings } = useAppStore();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("currentMonth");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filteredOrders = useMemo(() => {
    if (periodFilter === "allTime") {
      return orders;
    }
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return orders.filter((order) => {
      const dueDate = new Date(order.dueAt);
      return dueDate >= start && dueDate <= end;
    });
  }, [orders, periodFilter]);

  const totals = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        const priceTotal = order.price.total ?? 0;
        const deposit = order.payments
          .filter((payment) => payment.type === "deposit")
          .reduce((sum, payment) => sum + payment.amount, 0);
        acc.revenue += priceTotal;
        acc.received += deposit;
        acc.remaining += priceTotal - deposit;
        return acc;
      },
      { revenue: 0, received: 0, remaining: 0 }
    );
  }, [filteredOrders]);

  const openOrder = (order: Order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.finance.title}
        description={t.finance.description}
      />

      <DrawerSheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        title={editingOrder ? t.finance.drawerTitleEdit : t.finance.drawerTitleNew}
      >
        <OrderForm
          initialOrder={editingOrder}
          onCreated={closeForm}
          onUpdated={closeForm}
        />
      </DrawerSheet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.finance.summaryTitle}</h2>
        <select
          className="h-11 rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
        >
          <option value="currentMonth">{t.finance.periodFilters.currentMonth}</option>
          <option value="allTime">{t.finance.periodFilters.allTime}</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t.finance.stats.revenue, value: totals.revenue },
          { label: t.finance.stats.received, value: totals.received },
          { label: t.finance.stats.remaining, value: totals.remaining },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-5">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(stat.value, settings?.currency)}
            </p>
          </GlassCard>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title={t.finance.empty.title}
          description={t.finance.empty.description}
        />
      ) : (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold">{t.finance.listTitle}</h2>
          <div className="mt-4 space-y-3">
            {filteredOrders.map((order) => {
              const priceTotal = order.price.total ?? 0;
              const deposit = order.payments
                .filter((payment) => payment.type === "deposit")
                .reduce((sum, payment) => sum + payment.amount, 0);
              const remaining = priceTotal - deposit;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openOrder(order)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-4 text-left text-sm transition hover:border-slate-300/70 hover:bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-slate-700/70"
                >
                  <div className="min-w-[180px] flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span>{order.orderNo || order.id}</span>
                      <span className="text-slate-500">·</span>
                      <span>{order.customerName || t.orders.walkInCustomer}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{t.finance.dueLabel} {formatDate(order.dueAt)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{t.orders.statusLabels[order.status] ?? order.status}</span>
                    </div>
                  </div>
                  <div className="grid min-w-[190px] gap-1 text-right text-xs text-slate-500">
                    <div className="flex items-center justify-between gap-3">
                      <span>{t.finance.rowLabels.total}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(priceTotal, settings?.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{t.finance.rowLabels.deposit}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(deposit, settings?.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{t.finance.rowLabels.remaining}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(remaining, settings?.currency)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
