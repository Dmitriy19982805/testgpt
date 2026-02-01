import { useMemo } from "react";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { formatCurrency } from "../../utils/currency";
import { formatDateTime } from "../../utils/date";
import { t } from "../../i18n";

export function FinancePage() {
  const { orders, settings } = useAppStore();

  const payments = useMemo(
    () => orders.flatMap((order) => order.payments.map((payment) => ({ ...payment, orderNo: order.orderNo }))),
    [orders]
  );

  const totals = useMemo(() => {
    const income = payments.reduce((acc, payment) => acc + payment.amount, 0);
    const expenses = orders.reduce((acc, order) => acc + order.cost.totalCost, 0);
    return { income, expenses, net: income - expenses };
  }, [payments, orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.finance.title}
        description={t.finance.description}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t.finance.stats.income, value: totals.income },
          { label: t.finance.stats.expenses, value: totals.expenses },
          { label: t.finance.stats.net, value: totals.net },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-5">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(stat.value, settings?.currency)}
            </p>
          </GlassCard>
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title={t.finance.empty.title}
          description={t.finance.empty.description}
        />
      ) : (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold">{t.finance.paymentsTitle}</h2>
          <div className="mt-4 space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 text-sm dark:border-slate-800/60 dark:bg-slate-900/60"
              >
                <div>
                  <p className="font-medium">
                    {payment.orderNo} ·{" "}
                    {t.finance.paymentTypes[payment.type as keyof typeof t.finance.paymentTypes] ??
                      payment.type}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(payment.at)}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(payment.amount, settings?.currency)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
