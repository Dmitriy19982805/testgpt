import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../../components/ui/button";
import { formatDate } from "../../utils/date";
import { t } from "../../i18n";

export function PrintOrderPage() {
  const { id } = useParams();
  const { orders, customers } = useAppStore();
  const order = useMemo(() => orders.find((item) => item.id === id), [orders, id]);
  const customer = customers.find((c) => c.id === order?.customerId);

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
    <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-900 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{t.orders.print.summary}</p>
          <h1 className="text-2xl font-semibold">{order.orderNo}</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          {t.orders.print.print}
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500">{t.orders.print.customer}</h2>
          <p className="mt-2 text-lg font-medium">
            {customer?.name ?? t.orders.walkInCustomer}
          </p>
          <p className="text-sm text-slate-500">{customer?.phone}</p>
          <p className="text-sm text-slate-500">{customer?.email}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500">{t.orders.print.details}</h2>
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
        <h2 className="text-sm font-semibold uppercase text-slate-500">{t.orders.print.notes}</h2>
        <p className="mt-2 text-sm">{order.designNotes || t.orders.print.noDesignNotes}</p>
        <p className="mt-2 text-sm">
          {t.orders.print.inscriptionLabel} {order.inscriptionText || t.orders.print.none}
        </p>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-500">{t.orders.print.checklist}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
          {order.checklist.length === 0 ? (
            <li>{t.orders.print.noChecklist}</li>
          ) : (
            order.checklist.map((item) => <li key={item.id}>{item.text}</li>)
          )}
        </ul>
      </div>
    </div>
  );
}
