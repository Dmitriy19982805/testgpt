import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../../components/ui/button";
import { formatDate } from "../../utils/date";
import { t } from "../../i18n";
import { OriginModal } from "../../components/common/OriginModal";

export function PrintOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, customers, deleteOrder } = useAppStore();
  const order = useMemo(() => orders.find((item) => item.id === id), [orders, id]);
  const customer = customers.find((c) => c.id === order?.customerId);
  const customerName = customer?.name ?? order?.customerName ?? t.orders.walkInCustomer;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);

  const handleDelete = async () => {
    if (!order) {
      return;
    }
    await deleteOrder(order.id);
    navigate("/app/orders");
  };

  if (!order) {
    return (
      <div className="space-y-4">
        <p>{t.orders.print.notFound}</p>
        <Link to="/app/orders">
          <Button>{t.orders.print.backToOrders}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-900 shadow-soft dark:bg-slate-900/80 dark:text-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.orders.print.summary}
          </p>
          <h1 className="text-2xl font-semibold">{order.orderNo}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            {t.orders.print.print}
          </Button>
          <Button
            variant="ghost"
            className="text-rose-500 hover:text-rose-600"
            onClick={(event) => {
              setDeleteOriginRect(event.currentTarget.getBoundingClientRect());
              setConfirmOpen(true);
            }}
          >
            Удалить
          </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
            {t.orders.print.customer}
          </h2>
          <p className="mt-2 text-lg font-medium">
            {customerName}
          </p>
          {customer?.phone || customer?.secondaryContact ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {[customer?.phone, customer?.secondaryContact].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
            {t.orders.print.details}
          </h2>
          <p className="mt-2 text-sm">
            {t.orders.print.dueLabel} {formatDate(order.dueAt)}
          </p>
          <p className="text-sm">
            {t.orders.print.statusLabel} {t.orders.statusLabels[order.status] ?? order.status}
          </p>
          <p className="text-sm">
            {t.orders.print.fulfillmentLabel}{" "}
            {t.orders.fulfillment[order.pickupOrDelivery] ?? order.pickupOrDelivery}
          </p>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
          {t.orders.print.notes}
        </h2>
        <p className="mt-2 text-sm">{order.designNotes || t.orders.print.noDesignNotes}</p>
        <p className="mt-2 text-sm">
          {t.orders.print.inscriptionLabel} {order.inscriptionText || t.orders.print.none}
        </p>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
          {t.orders.print.checklist}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
          {order.checklist.length === 0 ? (
            <li>{t.orders.print.noChecklist}</li>
          ) : (
            order.checklist.map((item) => <li key={item.id}>{item.text}</li>)
          )}
        </ul>
      </div>

      <OriginModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
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
              onClick={handleDelete}
            >
              Удалить
            </Button>
          </>
        }
      />
    </div>
  );
}
