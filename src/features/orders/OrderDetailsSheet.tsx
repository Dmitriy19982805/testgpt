import { Badge } from "../../components/ui/badge";
import { CenterModal } from "../../components/common/CenterModal";
import { Button } from "../../components/ui/button";
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
  const { customers, recipes, settings } = useAppStore();

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
  const recipeName = recipes.find((recipe) => recipe.id === order.recipeId)?.name;

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

  return (
    <CenterModal
      open={open}
      onOpenChange={onOpenChange}
      title="Детали заказа"
      footer={
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-2xl"
          onClick={() => onOpenChange(false)}
        >
          Закрыть
        </Button>
      }
    >
      <div className="max-h-[80vh] space-y-3 overflow-y-auto pr-1">
        <div className="space-y-3 rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Заказ</p>
              <h3 className="text-xl font-semibold">Заказ №{order.orderNo || order.id}</h3>
            </div>
            <Badge tone={statusToneMap[order.status]}>{statusLabel}</Badge>
          </div>
          <div className="text-sm text-slate-500">Срок: {dueLabel}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/50">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Клиент
            </h4>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Имя</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {valueOrDash(customerName)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Телефон</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {valueOrDash(customerPhone)}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-slate-500">Доп. контакт</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {valueOrDash(secondaryContact)}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/50">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Доставка
            </h4>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Тип</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {valueOrDash(fulfillmentLabel)}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-slate-500">Адрес</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {order.pickupOrDelivery === "delivery"
                    ? valueOrDash(order.address)
                    : "—"}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Детали
          </h4>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Тип десерта</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.dessertType)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Рецепт</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(recipeName)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Вкус</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.flavor)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Размер</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.size)}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-slate-500">Надпись</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.inscriptionText)}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs text-slate-500">Декор</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.decorationNotes)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Оплата</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Сумма</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {renderCurrency(priceTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Предоплата</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {renderCurrency(priceTotal === null || priceTotal === undefined ? null : deposit)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span>Остаток</span>
              <span className="text-base font-semibold">{renderCurrency(remaining)}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Пожелания и чек-лист
          </h4>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Пожелания по дизайну</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {valueOrDash(order.designNotes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Чек-лист</p>
              {checklistItems.length === 0 ? (
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">—</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {checklistItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm dark:border-slate-800/60 dark:bg-slate-900/60"
                    >
                      <span
                        className={
                          item.done
                            ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                            : "h-2.5 w-2.5 rounded-full bg-slate-300"
                        }
                      />
                      <span className="text-slate-800 dark:text-slate-100">{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/60 p-4 dark:border-slate-800/60 dark:bg-slate-900/50">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Референсы</h4>
          {references.length === 0 ? (
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">—</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {references.map((ref) => {
                const isImage =
                  ref.urlOrData.startsWith("data:image") || imageRegex.test(ref.urlOrData);
                return (
                  <div
                    key={ref.id}
                    className="rounded-2xl border border-slate-200/60 bg-white/70 p-3 text-sm dark:border-slate-800/60 dark:bg-slate-900/60"
                  >
                    {isImage ? (
                      <img
                        src={ref.urlOrData}
                        alt={ref.name}
                        className="h-32 w-full rounded-xl object-cover"
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
          )}
        </section>
      </div>
    </CenterModal>
  );
}
