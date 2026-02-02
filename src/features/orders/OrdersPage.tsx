import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ru as ruLocale } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
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
import { DrawerSheet } from "../../components/common/DrawerSheet";
import { formatCurrency } from "../../utils/currency";
import type { Order } from "../../db/types";
import { OriginModal } from "../../components/common/OriginModal";
import { OrderDetailsSheet } from "./OrderDetailsSheet";

const views = ["list", "kanban", "calendar"] as const;

type View = (typeof views)[number];

export function OrdersPage() {
  const { orders, customers, settings, deleteOrder } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [dayOrdersOpen, setDayOrdersOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const customer = customers.find((c) => c.id === order.customerId);
      const customerLabel = customer?.name ?? order.customerName ?? "";
      const matchesQuery =
        order.orderNo.toLowerCase().includes(query.toLowerCase()) ||
        customerLabel.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && (query ? matchesQuery : true);
    });
  }, [orders, customers, statusFilter, query]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return eachDayOfInterval({ start, end });
  }, []);

  const toLocalDateKey = (value: Date | string) => {
    if (typeof value === "string" && value.length === 10) {
      return format(new Date(`${value}T00:00:00`), "yyyy-MM-dd");
    }
    return format(new Date(value), "yyyy-MM-dd");
  };

  const selectedDayOrders = useMemo(() => {
    if (!selectedDay) {
      return [];
    }
    return orders.filter((order) => toLocalDateKey(order.dueAt) === selectedDay);
  }, [orders, selectedDay]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayOrders.reduce((sum, order) => sum + (order.price.total ?? 0), 0);
  }, [selectedDayOrders]);

  const selectedDayDate = selectedDay ? new Date(`${selectedDay}T00:00:00`) : null;

  const openDeleteConfirm = (order: Order) => {
    setConfirmOrder(order);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmOrder) {
      return;
    }
    await deleteOrder(confirmOrder.id);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setShowForm(true);
    setDayOrdersOpen(false);
  };

  const openDetails = (order: Order) => {
    setDetailsOrder(order);
    setDetailsOpen(true);
    setDayOrdersOpen(false);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const openNewOrder = () => {
    setEditingOrder(null);
    setShowForm(true);
  };

  const handleToggleForm = () => {
    if (showForm) {
      closeForm();
      return;
    }
    openNewOrder();
  };

  const openDayOrders = (dayKey: string) => {
    const dayHasOrders = orders.some((order) => toLocalDateKey(order.dueAt) === dayKey);
    if (!dayHasOrders) {
      return;
    }
    setSelectedDay(dayKey);
    setDayOrdersOpen(true);
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

      <DrawerSheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        title={editingOrder ? "Редактирование заказа" : "Новый заказ"}
      >
        <OrderForm
          initialOrder={editingOrder}
          onCreated={closeForm}
          onUpdated={closeForm}
        />
      </DrawerSheet>

      <DrawerSheet
        open={dayOrdersOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDayOrdersOpen(false);
          }
        }}
        title={
          selectedDayDate
            ? `Заказы на ${format(selectedDayDate, "d MMMM yyyy", { locale: ruLocale })}`
            : "Заказы"
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>Всего: {selectedDayOrders.length}</span>
            <span>
              На сумму: {formatCurrency(selectedDayTotal, settings?.currency ?? "RUB")}
            </span>
          </div>
          <div className="space-y-3">
            {selectedDayOrders.map((order) => {
              const customer = customers.find((c) => c.id === order.customerId);
              const customerLabel =
                customer?.name ?? order.customerName ?? t.orders.walkInCustomer;
              return (
                <div
                  key={order.id}
                  onClick={() => openDetails(order)}
                  className="glass-card flex w-full flex-wrap items-center justify-between gap-4 p-4 text-left transition hover:border-slate-300/70 hover:bg-white/90 dark:hover:border-slate-700/70"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetails(order);
                    }
                  }}
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold">{customerLabel}</p>
                    <p className="text-xs text-slate-500">
                      {order.orderNo} •{" "}
                      {format(new Date(order.dueAt), "d MMM, HH:mm", { locale: ruLocale })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={order.status === "ready" ? "success" : "info"}>
                      {t.orders.statusLabels[order.status] ?? order.status}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {formatCurrency(order.price.total ?? 0, settings?.currency ?? "RUB")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(order);
                      }}
                      aria-label="Редактировать заказ"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0 text-rose-500 hover:text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteOriginRect(event.currentTarget.getBoundingClientRect());
                        openDeleteConfirm(order);
                      }}
                      aria-label="Удалить заказ"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          onAction={openNewOrder}
        />
      ) : null}

      {view === "list" && orders.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((order) => {
            const customer = customers.find((c) => c.id === order.customerId);
            const customerLabel = customer?.name ?? order.customerName ?? t.orders.walkInCustomer;
            return (
              <GlassCard
                key={order.id}
                className="cursor-pointer p-5 transition hover:border-slate-300/70"
                onClick={() => openDetails(order)}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{order.orderNo}</p>
                    <h3 className="text-lg font-semibold">{customerLabel}</h3>
                    <p className="text-sm text-slate-500">
                      {t.orders.duePrefix} {formatDate(order.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={order.status === "ready" ? "success" : "info"}>
                      {t.orders.statusLabels[order.status] ?? order.status}
                    </Badge>
                    <Link
                      to={`/app/orders/print/${order.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button variant="outline" size="sm">
                        {t.orders.printSummary}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-full p-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(order);
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
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetails(order)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetails(order);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{order.orderNo}</p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-full p-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(order);
                            }}
                            aria-label="Редактировать заказ"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-full p-0 text-rose-500 hover:text-rose-600"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteOriginRect(event.currentTarget.getBoundingClientRect());
                              openDeleteConfirm(order);
                            }}
                            aria-label="Удалить заказ"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
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
              const dayKey = format(day, "yyyy-MM-dd");
              const dueOrders = orders.filter((order) => toLocalDateKey(order.dueAt) === dayKey);
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
                  role="button"
                  tabIndex={0}
                  onClick={() => openDayOrders(dayKey)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDayOrders(dayKey);
                    }
                  }}
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
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteOriginRect(event.currentTarget.getBoundingClientRect());
                              openDeleteConfirm(order);
                            }}
                            aria-label="Удалить заказ"
                          >
                            <Trash2 size={12} />
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
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleConfirmDelete}
            >
              Удалить
            </Button>
          </>
        }
      />
    </div>
  );
}
