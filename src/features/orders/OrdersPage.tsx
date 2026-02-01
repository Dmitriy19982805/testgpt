import { useMemo, useState } from "react";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
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

const views = ["list", "kanban", "calendar"] as const;

type View = (typeof views)[number];

export function OrdersPage() {
  const { orders, customers, settings } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [showForm, setShowForm] = useState(false);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track production, delivery, and payments across every cake order."
        action={
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Close" : "New order"}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6">
          <OrderForm onCreated={() => setShowForm(false)} />
        </GlassCard>
      ) : null}

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search order or customer"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-xs"
          />
          <select
            className="h-11 rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In progress</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="ml-auto flex gap-2">
            {views.map((mode) => (
              <Button
                key={mode}
                variant={view === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </GlassCard>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Start by adding your first cake order."
          actionLabel="Create order"
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
                      {customer?.name ?? "Walk-in customer"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Due {formatDate(order.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={order.status === "ready" ? "success" : "info"}>
                      {order.status}
                    </Badge>
                    <Link to={`/app/orders/print/${order.id}`}>
                      <Button variant="outline" size="sm">
                        Print summary
                      </Button>
                    </Link>
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
            { label: "Draft", status: "draft" },
            { label: "Confirmed", status: "confirmed" },
            { label: "In progress", status: "in-progress" },
            { label: "Ready", status: "ready" },
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
                      <p className="font-medium">{order.orderNo}</p>
                      <p className="text-xs text-slate-500">
                        Due {formatDate(order.dueAt)}
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
              <h3 className="text-lg font-semibold">{format(new Date(), "MMMM yyyy")}</h3>
              <p className="text-sm text-slate-500">
                Capacity: {settings?.dayCapacityRules ?? 0} orders/day
              </p>
            </div>
            <Button variant="subtle" size="sm">
              Jump to today
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
                      <span className="text-[10px] text-rose-500">Over</span>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dueOrders.slice(0, 2).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-full bg-slate-900/90 px-2 py-1 text-[10px] text-white"
                      >
                        {order.orderNo}
                      </div>
                    ))}
                    {dueOrders.length > 2 ? (
                      <span className="text-[10px] text-slate-400">
                        +{dueOrders.length - 2} more
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
