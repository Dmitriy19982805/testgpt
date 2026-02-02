import { useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "../../components/ui/button";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import type { Customer, Order } from "../../db/types";
import { t } from "../../i18n";
import { ActionMenu } from "../../components/common/ActionMenu";
import { DrawerSheet } from "../../components/common/DrawerSheet";
import { CustomerForm } from "./CustomerForm";
import { OrderForm } from "../orders/OrderForm";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";

export function CustomersPage() {
  const { customers, orders, settings, deleteCustomer } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [actionCustomerId, setActionCustomerId] = useState<string | null>(null);
  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleDelete = async (customer: Customer) => {
    const hasOrders = orders.some((order) => order.customerId === customer.id);
    if (hasOrders) {
      window.alert("Нельзя удалить клиента: есть связанные заказы.");
      return;
    }
    const confirmed = window.confirm(`Удалить клиента ${customer.name}?`);
    if (!confirmed) {
      return;
    }
    await deleteCustomer(customer.id);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
    setActionCustomerId(null);
  };

  const openNewCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleToggleForm = () => {
    if (showForm) {
      closeForm();
      return;
    }
    openNewCustomer();
  };

  const activeCustomer = actionCustomerId
    ? customers.find((customer) => customer.id === actionCustomerId)
    : null;
  const activeAnchor = actionCustomerId ? actionButtonRefs.current[actionCustomerId] : null;
  const customerOrders = useMemo(() => {
    if (!editingCustomer) {
      return [];
    }

    return [...orders]
      .filter((order) => order.customerId === editingCustomer.id)
      .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  }, [editingCustomer, orders]);

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setShowOrderForm(true);
  };

  const closeOrderForm = () => {
    setEditingOrder(null);
    setShowOrderForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.customers.title}
        description={t.customers.description}
        action={
          <Button onClick={handleToggleForm}>
            {showForm ? t.customers.actions.close : t.customers.actions.add}
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
        title={editingCustomer ? "Редактирование клиента" : "Новый клиент"}
      >
        <div className="space-y-6">
          <CustomerForm
            initialCustomer={editingCustomer}
            onSaved={() => {
              closeForm();
            }}
          />
          {editingCustomer ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">История заказов</h3>
                <span className="text-xs text-slate-500">
                  {customerOrders.length}
                </span>
              </div>
              {customerOrders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-700/70">
                  Заказов пока нет
                </p>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => handleEditOrder(order)}
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-left text-sm transition hover:border-slate-300/80 dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-slate-500/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            {formatDate(order.dueAt)}
                          </p>
                          <p className="text-sm font-medium">
                            {t.orders.statusLabels[order.status] ?? order.status}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(order.price.total, settings?.currency)}
                        </p>
                      </div>
                      {order.designNotes ? (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                          {order.designNotes}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DrawerSheet>

      <DrawerSheet
        open={showOrderForm}
        onOpenChange={(open) => {
          if (!open) {
            closeOrderForm();
          }
        }}
        title="Редактирование заказа"
      >
        <OrderForm initialOrder={editingOrder} onUpdated={closeOrderForm} />
      </DrawerSheet>

      {customers.length === 0 ? (
        <EmptyState
          title={t.customers.empty.title}
          description={t.customers.empty.description}
          actionLabel={t.customers.empty.action}
          onAction={openNewCustomer}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((customer) => (
            <GlassCard key={customer.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  {customer.phone || customer.secondaryContact ? (
                    <p className="text-sm text-slate-500">
                      {[customer.phone, customer.secondaryContact].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                  ref={(node) => {
                    actionButtonRefs.current[customer.id] = node;
                  }}
                  onClick={() => setActionCustomerId(customer.id)}
                  aria-label="Действия с клиентом"
                >
                  <Pencil size={16} />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <ActionMenu
        open={Boolean(activeCustomer)}
        anchorEl={activeAnchor}
        onOpenChange={(open) => {
          if (!open) {
            setActionCustomerId(null);
          }
        }}
        onEdit={() => {
          if (activeCustomer) {
            handleEdit(activeCustomer);
          }
        }}
        onDelete={() => {
          if (activeCustomer) {
            void handleDelete(activeCustomer);
          }
        }}
      />
    </div>
  );
}
