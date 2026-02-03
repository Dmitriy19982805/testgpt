import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../../components/ui/button";
import { formatCurrency } from "../../utils/currency";
import { formatDate, resolveDueTime } from "../../utils/date";
import { t } from "../../i18n";
import { OriginModal } from "../../components/common/OriginModal";

export function PrintOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, customers, deleteOrder, settings } = useAppStore();
  const order = useMemo(() => orders.find((item) => item.id === id), [orders, id]);
  const customer = customers.find((c) => c.id === order?.customerId);
  const customerName = customer?.name ?? order?.customerName ?? t.orders.walkInCustomer;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!order) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      navigate("/app/orders");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeleteOriginRect(null);
    }
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

  const valueOrDash = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    return value;
  };

  const priceTotal = order.price.total;
  const deposit = order.payments
    .filter((payment) => payment.type === "deposit")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = priceTotal === null || priceTotal === undefined ? null : priceTotal - deposit;

  const renderCurrency = (value?: number | null) => {
    if (value === null || value === undefined) {
      return "—";
    }
    return formatCurrency(value, settings?.currency);
  };

  return (
    <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-900 shadow-soft dark:bg-slate-900/80 dark:text-slate-50">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.orders.print.summary}
          </p>
          <h1 className="text-2xl font-semibold">{order.orderNo || order.id}</h1>
          {order.createdAt ? (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {t.orders.print.createdLabel} {formatDate(order.createdAt)}
            </p>
          ) : null}
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
            {t.orders.print.delete}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.orders.print.clientBlock}
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.clientName}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(customerName)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.clientPhone}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(customer?.phone)}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-slate-500">{t.orders.print.clientSecondary}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(customer?.secondaryContact)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.orders.print.conditionsBlock}
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.readyDate}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.dueAt ? formatDate(order.dueAt) : null)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.readyTime}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(resolveDueTime(order.dueTime))}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-slate-500">{t.orders.print.fulfillment}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(
                  t.orders.fulfillment[order.pickupOrDelivery] ?? order.pickupOrDelivery
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.orders.print.productBlock}
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.productType}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.dessertType)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.productFlavor}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.flavor)}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-slate-500">{t.orders.print.productSize}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.size)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.orders.print.decorationBlock}
          </h2>
          <div className="grid gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.inscription}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.inscriptionText)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t.orders.print.decorationNotes}</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.decorationNotes)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/60 lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.orders.print.paymentBlock}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t.orders.print.totalPrice}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {renderCurrency(priceTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t.orders.print.deposit}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {renderCurrency(priceTotal === null || priceTotal === undefined ? null : deposit)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span>{t.orders.print.remaining}</span>
              <span className="text-base font-semibold">{renderCurrency(remaining)}</span>
            </div>
          </div>
        </section>
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
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleDelete}
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
