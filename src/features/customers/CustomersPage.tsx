import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import type { Customer, Order } from "../../db/types";
import { t } from "../../i18n";
import { DrawerSheet } from "../../components/common/DrawerSheet";
import { CustomerForm } from "./CustomerForm";
import { OrderForm } from "../orders/OrderForm";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { CenterModal } from "../../components/common/CenterModal";
import { OriginModal } from "../../components/common/OriginModal";

export function CustomersPage() {
  const { customers, orders, settings, deleteCustomer } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCustomer, setConfirmCustomer] = useState<Customer | null>(null);
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [formOriginRect, setFormOriginRect] = useState<DOMRect | null>(null);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);
  const [blockedDeleteOpen, setBlockedDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (customer: Customer) => {
    const hasOrders = orders.some((order) => order.customerId === customer.id);
    if (hasOrders) {
      setBlockedDeleteOpen(true);
      return;
    }
    setConfirmCustomer(customer);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmCustomer) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCustomer(confirmCustomer.id);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setConfirmCustomer(null);
      setDeleteOriginRect(null);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
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
          <Button
            onClick={(event) => {
              setFormOriginRect(event.currentTarget.getBoundingClientRect());
              handleToggleForm();
            }}
          >
            {showForm ? t.customers.actions.close : t.customers.actions.add}
          </Button>
        }
      />

      <OriginModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        originRect={formOriginRect}
        title={editingCustomer ? "Редактирование клиента" : "Новый клиент"}
        footer={null}
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
      </OriginModal>

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
            <GlassCard
              key={customer.id}
              className="cursor-pointer p-5 transition hover:border-slate-300/70"
              onClick={() => setDetailsCustomer(customer)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  {customer.phone || customer.secondaryContact ? (
                    <p className="text-sm text-slate-500">
                      {[customer.phone, customer.secondaryContact].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFormOriginRect(event.currentTarget.getBoundingClientRect());
                      handleEdit(customer);
                    }}
                    aria-label="Редактировать клиента"
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
                      void handleDelete(customer);
                    }}
                    aria-label="Удалить клиента"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <CenterModal
        open={Boolean(detailsCustomer)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsCustomer(null);
          }
        }}
        title={detailsCustomer?.name ?? "Клиент"}
        description="Детали клиента"
        footer={
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-2xl"
            onClick={() => setDetailsCustomer(null)}
          >
            Закрыть
          </Button>
        }
      >
        {detailsCustomer ? (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-200">
            <div className="space-y-1">
              <p className="text-xs uppercase text-slate-400">Контакты</p>
              <p>{detailsCustomer.phone || "—"}</p>
              <p>{detailsCustomer.secondaryContact || detailsCustomer.email || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-slate-400">Заметки</p>
              <p>{detailsCustomer.notes || "—"}</p>
            </div>
          </div>
        ) : null}
      </CenterModal>

      <OriginModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmCustomer(null);
          }
        }}
        originRect={deleteOriginRect}
        title="Удалить клиента?"
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

      <CenterModal
        open={blockedDeleteOpen}
        onOpenChange={setBlockedDeleteOpen}
        title="Удаление недоступно"
        description="Нельзя удалить клиента: есть связанные заказы."
        className="w-full max-w-[520px] rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8"
        containerClassName="fixed inset-0 z-50 h-full w-full"
        footerClassName="mt-6 flex w-full"
        footer={
          <Button
            type="button"
            className="w-full rounded-2xl"
            onClick={() => setBlockedDeleteOpen(false)}
          >
            Понятно
          </Button>
        }
      />
    </div>
  );
}
