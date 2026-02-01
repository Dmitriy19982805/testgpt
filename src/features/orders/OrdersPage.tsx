import { useMemo, useRef, useState } from "react";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ru as ruLocale } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { cn } from "../../components/ui/utils";
import { useAppStore } from "../../store/useAppStore";
import { formatDate } from "../../utils/date";
import { OrderForm } from "./OrderForm";
import { EmptyState } from "../../components/common/EmptyState";
import { Link } from "react-router-dom";
import { t } from "../../i18n";
import { ActionMenu } from "../../components/common/ActionMenu";
import type { Order } from "../../db/types";

const views = ["list", "kanban", "calendar"] as const;

type View = (typeof views)[number];

export function OrdersPage() {
  const { orders, customers, settings, deleteOrder } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const customer = customers.find((c) => c.id === order.customerId);
      const matchesQuery =
        order.orderNo.toLowerCase().includes(query.toLowerCase()) ||
        customer?.name.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && (query ? matchesQuery : true);
    });
  }, [orders, customers, statusFilter, query]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return eachDayOfInterval({ start, end });
  }, []);

  const handleDelete = async (id: string, orderNo: string) => {
    const confirmed = window.confirm(`Удалить заказ ${orderNo}?`);
    if (!confirmed) {
      return;
    }
    await deleteOrder(id);
  };

  const activeOrder = actionOrderId ? orders.find((order) => order.id === actionOrderId) : null;
  const activeAnchor = actionOrderId ? actionButtonRefs.current[actionOrderId] : null;

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setShowForm(true);
    setActionOrderId(null);
  };

  const handleToggleForm = () => {
    if (showForm) {
      setShowForm(false);
      setEditingOrder(null);
      return;
    }
    setEditingOrder(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.orders.title}
        description={t.orders.description}
        action={
          <Button onClick={handleToggleForm}>
            {showForm ? t.orders.actions.close : t.orders.actions.new}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6">
          <OrderForm
            initialOrder={editingOrder}
            onCreated={() => setShowForm(false)}
            onUpdated={() => {
              setShowForm(false);
              setEditingOrder(null);
            }}
          />
        </GlassCard>
      ) : null}

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder={t.orders.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-xs"
          />
          <select
            className="h-11 rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">{t.orders.statusFilterAll}</option>
            <option value="draft">{t.orders.statusLabels.draft}</option>
            <option value="confirmed">{t.orders.statusLabels.confirmed}</option>
            <option value="in-progress">{t.orders.statusLabels["in-progress"]}</option>
            <option value="ready">{t.orders.statusLabels.ready}</option>
            <option value="completed">{t.orders.statusLabels.completed}</option>
            <option value="cancelled">{t.orders.statusLabels.cancelled}</option>
          </select>
          <div className="ml-auto flex gap-2">
            {views.map((mode) => (
              <Button
                key={mode}
                variant={view === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(mode)}
              >
                {t.orders.views[mode]}
              </Button>
            ))}
          </div>
        </div>
      </GlassCard>

      {orders.length === 0 ? (
        <EmptyState
          title={t.orders.empty.title}
          description={t.orders.empty.description}
          actionLabel={t.orders.empty.action}
          onAction={() => setShowForm(true)}
        />
      ) : null}

      {view === "list" && orders.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((order) => {
            const customer = customers.find((c) => c.id === order.customerId);
            return (
              <GlassCard key={order.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{order.orderNo}</p>
                    <h3 className="text-lg font-semibold">
                      {customer?.name ?? t.orders.walkInCustomer}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t.orders.duePrefix} {formatDate(order.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                  <Badge tone={order.status === "ready" ? "success" : "info"}>
                    {t.orders.statusLabels[order.status] ?? order.status}
                  </Badge>
                  <Link to={`/app/orders/print/${order.id}`}>
                    <Button variant="outline" size="sm">
                      {t.orders.printSummary}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    ref={(node) => {
                      actionButtonRefs.current[order.id] = node;
                    }}
                    onClick={() => setActionOrderId(order.id)}
                    aria-label="Действия с заказом"
                  >
                    <Pencil size={16} />
                  </Button>
                </div>
              </div>
            </GlassCard>
          );
          })}
        </div>
      ) : null}

      {view === "kanban" && orders.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            { label: t.orders.statusLabels.draft, status: "draft" },
            { label: t.orders.statusLabels.confirmed, status: "confirmed" },
            { label: t.orders.statusLabels["in-progress"], status: "in-progress" },
            { label: t.orders.statusLabels.ready, status: "ready" },
          ].map((column) => (
            <GlassCard key={column.status} className="p-4">
              <h3 className="text-sm font-semibold">{column.label}</h3>
              <div className="mt-4 space-y-3">
                {filtered
                  .filter((order) => order.status === column.status)
                  .map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm dark:border-slate-800/60 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{order.orderNo}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-full p-0"
                          ref={(node) => {
                            actionButtonRefs.current[order.id] = node;
                          }}
                          onClick={() => setActionOrderId(order.id)}
                          aria-label="Действия с заказом"
                        >
                          <Pencil size={14} />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">
                        {t.orders.duePrefix} {formatDate(order.dueAt)}
                      </p>
                    </div>
                  ))}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : null}

      {view === "calendar" ? (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {format(new Date(), "MMMM yyyy", { locale: ruLocale })}
              </h3>
              <p className="text-sm text-slate-500">
                {t.orders.calendar.capacityLabel}: {settings?.dayCapacityRules ?? 0}{" "}
                {t.orders.calendar.ordersPerDay}
              </p>
            </div>
            <Button variant="subtle" size="sm">
              {t.orders.calendar.jumpToToday}
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-2 text-xs">
            {calendarDays.map((day) => {
              const dueOrders = orders.filter(
                (order) => format(new Date(order.dueAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
              );
              const isOverCapacity =
                (settings?.dayCapacityRules ?? 0) > 0 &&
                dueOrders.length > (settings?.dayCapacityRules ?? 0);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "rounded-2xl border border-slate-200/60 bg-white/70 p-2 dark:border-slate-800/60 dark:bg-slate-900/60",
                    isOverCapacity && "border-rose-300/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{format(day, "d")}</span>
                    {isOverCapacity ? (
                      <span className="text-[10px] text-rose-500">{t.orders.calendar.over}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dueOrders.slice(0, 2).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-full bg-slate-900/90 px-2 py-1 text-[10px] text-white"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{order.orderNo}</span>
                          <button
                            type="button"
                            className="text-[10px] text-rose-200 hover:text-rose-100"
                            onClick={() => handleDelete(order.id, order.orderNo)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                    {dueOrders.length > 2 ? (
                      <span className="text-[10px] text-slate-400">
                        +{dueOrders.length - 2} {t.orders.calendar.more}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : null}

      <ActionMenu
        open={Boolean(activeOrder)}
        onClose={() => setActionOrderId(null)}
        anchorEl={activeAnchor}
        actions={
          activeOrder
            ? [
                { label: "Редактировать", onSelect: () => handleEdit(activeOrder) },
                {
                  label: "Удалить",
                  tone: "destructive",
                  onSelect: async () => {
                    setActionOrderId(null);
                    await handleDelete(activeOrder.id, activeOrder.orderNo);
                  },
                },
              ]
            : []
        }
      />
    </div>
  );
}
