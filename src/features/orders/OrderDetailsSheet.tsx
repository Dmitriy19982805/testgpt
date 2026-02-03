import { Badge } from "../../components/ui/badge";
import { CenterModal } from "../../components/common/CenterModal";
import { formatCurrency } from "../../utils/currency";
import { formatDueDateTime } from "../../utils/date";
import { t } from "../../i18n";
import { useAppStore } from "../../store/useAppStore";
import type { Order } from "../../db/types";

interface OrderDetailsSheetProps {
  open: boolean;
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

const statusToneMap: Record<Order["status"], "default" | "success" | "warning" | "info"> = {
  draft: "default",
  confirmed: "info",
  "in-progress": "info",
  ready: "success",
  completed: "success",
  cancelled: "warning",
};

const imageRegex = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;

const valueOrDash = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return value;
};

export function OrderDetailsSheet({ open, order, onOpenChange }: OrderDetailsSheetProps) {
  const { customers, settings } = useAppStore();

  if (!order) {
    return null;
  }

  const customer = customers.find((item) => item.id === order.customerId);
  const customerName = customer?.name ?? order.customerName;
  const customerPhone = customer?.phone;
  const secondaryContact = customer?.secondaryContact;
  const statusLabel = t.orders.statusLabels[order.status] ?? order.status;
  const dueLabel = order.dueAt
    ? formatDueDateTime(order.dueAt, order.dueTime)
    : "—";
  const fulfillmentLabel =
    t.orders.fulfillment[order.pickupOrDelivery] ?? order.pickupOrDelivery;
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

  const checklistItems = order.checklist ?? [];
  const references = order.references ?? [];
  const hasNotes = Boolean(order.designNotes?.trim());
  const hasChecklist = checklistItems.length > 0;
  const hasReferences = references.length > 0;

  return (
    <CenterModal
      open={open}
      onOpenChange={onOpenChange}
      title="Детали заказа"
      className="w-[92vw] max-w-[960px] rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-2xl md:p-5"
      containerClassName="fixed inset-0 z-50 h-screen w-screen overflow-hidden"
      bodyClassName="mt-3 grid gap-3"
      showCloseButton
    >
      <section className="rounded-2xl border border-slate-200/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Заказ</p>
            <h3 className="text-base font-semibold text-slate-900">
              Заказ №{order.orderNo || order.id}
            </h3>
            <div className="text-xs text-slate-500">Дата и время: {dueLabel}</div>
          </div>
          <Badge tone={statusToneMap[order.status]} className="px-2 py-1 text-[11px]">
            {statusLabel}
          </Badge>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="space-y-2 rounded-2xl border border-slate-200/60 p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Детали изделия
          </h4>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Тип</p>
              <p className="font-medium text-slate-900">{valueOrDash(order.dessertType)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Вкус</p>
              <p className="font-medium text-slate-900">{valueOrDash(order.flavor)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Размер</p>
              <p className="font-medium text-slate-900">{valueOrDash(order.size)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Надпись</p>
              <p className="font-medium text-slate-900">{valueOrDash(order.inscriptionText)}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-slate-500">Декор</p>
              <p className="font-medium text-slate-900">{valueOrDash(order.decorationNotes)}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-3">
          <section className="space-y-2 rounded-2xl border border-slate-200/60 p-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Клиент
            </h4>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Имя</p>
                <p className="font-medium text-slate-900">{valueOrDash(customerName)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Телефон</p>
                <p className="font-medium text-slate-900">{valueOrDash(customerPhone)}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-slate-500">Доп. контакт</p>
                <p className="font-medium text-slate-900">{valueOrDash(secondaryContact)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-slate-200/60 p-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Получение / Доставка
            </h4>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Тип</p>
                <p className="font-medium text-slate-900">{valueOrDash(fulfillmentLabel)}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-slate-500">Адрес</p>
                <p className="font-medium text-slate-900">
                  {order.pickupOrDelivery === "delivery" ? valueOrDash(order.address) : "—"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="space-y-2 rounded-2xl border border-slate-200/60 p-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Оплата</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/60 px-3 py-2">
            <span className="text-slate-500">Итоговая цена</span>
            <span className="font-semibold text-slate-900">{renderCurrency(priceTotal)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200/60 px-3 py-2">
            <span className="text-slate-500">Аванс</span>
            <span className="font-semibold text-slate-900">
              {renderCurrency(priceTotal === null || priceTotal === undefined ? null : deposit)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3 py-2 text-emerald-700">
            <span>Остаток</span>
            <span className="font-semibold">{renderCurrency(remaining)}</span>
          </div>
        </div>
      </section>

      {(hasNotes || hasChecklist || hasReferences) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {hasNotes && (
            <details className="group rounded-2xl border border-slate-200/60 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Заметки</span>
                <span className="text-base text-slate-400 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-2 text-sm text-slate-900">
                <p className="font-medium">{valueOrDash(order.designNotes)}</p>
              </div>
            </details>
          )}

          {hasChecklist && (
            <details className="group rounded-2xl border border-slate-200/60 p-3 lg:col-span-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Чек-лист</span>
                <span className="text-base text-slate-400 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-2 text-sm">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {checklistItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200/60 px-3 py-2 text-sm"
                    >
                      <span
                        className={
                          item.done
                            ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                            : "h-2.5 w-2.5 rounded-full bg-slate-300"
                        }
                      />
                      <span className="text-slate-800">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {hasReferences && (
            <details className="group rounded-2xl border border-slate-200/60 p-3 lg:col-span-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Референсы</span>
                <span className="text-base text-slate-400 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-2">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  {references.map((ref) => {
                    const isImage =
                      ref.urlOrData.startsWith("data:image") || imageRegex.test(ref.urlOrData);
                    return (
                      <div key={ref.id} className="rounded-xl border border-slate-200/60 p-3">
                        {isImage ? (
                          <img
                            src={ref.urlOrData}
                            alt={ref.name}
                            className="h-20 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <a
                            href={ref.urlOrData}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sky-600 hover:underline"
                          >
                            {ref.urlOrData}
                          </a>
                        )}
                        <p className="mt-2 truncate text-xs text-slate-500">
                          {valueOrDash(ref.name)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </CenterModal>
  );
}
