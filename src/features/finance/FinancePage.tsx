import { useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { t } from "../../i18n";
import { DrawerSheet } from "../../components/common/DrawerSheet";
import { OrderForm } from "../orders/OrderForm";
import { OrderDetailsSheet } from "../orders/OrderDetailsSheet";
import type { Order } from "../../db/types";
import { Button } from "../../components/ui/button";
import { OriginModal } from "../../components/common/OriginModal";

const periodFilters = ["currentMonth", "allTime"] as const;
type PeriodFilter = (typeof periodFilters)[number];

export function FinancePage() {
  const { orders, settings, deleteOrder } = useAppStore();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("currentMonth");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openOrderDetails = (order: Order) => {
    setDetailsOrder(order);
    setDetailsOpen(true);
  };

  const handleEditFromDetails = (order: Order) => {
    setDetailsOpen(false);
    setDetailsOrder(null);
    setEditingOrder(order);
    setShowForm(true);
  };

  const openDeleteConfirm = (order: Order) => {
    setConfirmOrder(order);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmOrder) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteOrder(confirmOrder.id);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setConfirmOrder(null);
      setDeleteOriginRect(null);
    }
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
                <div
                  key={order.id}
                  onClick={() => openOrderDetails(order)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-4 text-left text-sm transition hover:border-slate-300/70 hover:bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-slate-700/70"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openOrderDetails(order);
                    }
                  }}
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
                  <div className="flex items-center gap-4">
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 rounded-full p-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditFromDetails(order);
                        }}
                        aria-label="Редактировать заказ"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 rounded-full p-0 text-rose-500 hover:text-rose-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteOriginRect(event.currentTarget.getBoundingClientRect());
                          openDeleteConfirm(order);
                        }}
                        aria-label="Удалить заказ"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <OriginModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmOrder(null);
          }
        }}
        originRect={deleteOriginRect}
        title="Удалить заказ?"
        description="Это действие нельзя отменить."
        variant="danger"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </Button>
          </>
        }
      />
    </div>
  );
}
