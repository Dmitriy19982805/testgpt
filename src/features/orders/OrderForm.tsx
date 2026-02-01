import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../components/ui/utils";
import { createId, createOrderNumber } from "../../utils/ids";
import { useAppStore } from "../../store/useAppStore";
import type { Order } from "../../db/types";
import { t } from "../../i18n";
import { formatCurrency } from "../../utils/currency";

const schema = z.object({
  customerName: z.string().min(2, t.orders.form.customerNameRequired),
  dueAt: z.string().min(1, t.orders.form.dueDateRequired),
  status: z.enum(["draft", "confirmed", "in-progress", "ready", "completed"]),
  pickupOrDelivery: z.enum(["pickup", "delivery"]),
  address: z.string().optional(),
  designNotes: z.string().optional(),
  priceTotal: z.coerce.number().min(0),
  deposit: z.coerce.number().min(0),
  checklist: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof schema>;
type FormStatus = "draft" | "confirmed" | "in-progress" | "ready" | "completed";

const toFormStatus = (s: string): FormStatus =>
  (s === "cancelled" ? "draft" : s) as FormStatus;

const steps = t.orders.form.steps;

interface OrderFormProps {
  onCreated?: () => void;
  onUpdated?: () => void;
  initialOrder?: Order | null;
}

export function OrderForm({ onCreated, onUpdated, initialOrder }: OrderFormProps) {
  const { customers, orders, addOrder, updateOrder, settings } = useAppStore();
  const [step, setStep] = useState(0);
  const [references, setReferences] = useState<
    { id: string; name: string; urlOrData: string }[]
  >([]);

  const defaultValues = useMemo(
    () => ({
      customerName:
        customers.find((customer) => customer.id === initialOrder?.customerId)?.name ?? "",
      dueAt: initialOrder ? initialOrder.dueAt.slice(0, 10) : "",
      status: toFormStatus(initialOrder?.status ?? "draft"),
      pickupOrDelivery: initialOrder?.pickupOrDelivery ?? "pickup",
      address: initialOrder?.address ?? "",
      designNotes: initialOrder?.designNotes ?? "",
      priceTotal: initialOrder?.price.total ?? 0,
      deposit:
        initialOrder?.payments.find((payment) => payment.type === "deposit")?.amount ?? 0,
      checklist: initialOrder?.checklist.map((item) => item.text).join("\n") ?? "",
    }),
    [customers, initialOrder]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    setReferences(initialOrder?.references ?? []);
  }, [defaultValues, initialOrder, reset]);

  const depositRemaining = useMemo(() => {
    const priceTotal = Number(watch("priceTotal") ?? 0);
    const deposit = Number(watch("deposit") ?? 0);
    return Math.max(priceTotal - deposit, 0);
  }, [watch]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert(t.orders.form.referenceTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferences((prev) => [
        ...prev,
        { id: createId("ref"), name: file.name, urlOrData: String(reader.result) },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: OrderFormValues) => {
    const customerId = customers.find((c) => c.name === values.customerName)?.id;
    if (initialOrder) {
      const depositPaymentIndex = initialOrder.payments.findIndex(
        (payment) => payment.type === "deposit"
      );
      const nextPayments = [...initialOrder.payments];
      if (depositPaymentIndex >= 0) {
        nextPayments[depositPaymentIndex] = {
          ...nextPayments[depositPaymentIndex],
          amount: values.deposit,
        };
      } else {
        nextPayments.push({
          id: createId("pay"),
          type: "deposit",
          amount: values.deposit,
          at: new Date().toISOString(),
          method: "manual",
        });
      }

      const updatedOrder: Order = {
        ...initialOrder,
        status: values.status,
        dueAt: new Date(values.dueAt).toISOString(),
        customerId: customerId ?? initialOrder.customerId,
        designNotes: values.designNotes ?? "",
        pickupOrDelivery: values.pickupOrDelivery,
        address: values.address ?? "",
        price: {
          ...initialOrder.price,
          subtotal: values.priceTotal,
          total: values.priceTotal,
        },
        payments: nextPayments,
        checklist: (values.checklist ?? "")
          .split("\n")
          .filter(Boolean)
          .map((text) => ({ id: createId("check"), text, done: false })),
        references,
      };

      await updateOrder(updatedOrder);
      onUpdated?.();
      return;
    }

    const newOrder: Order = {
      id: createId("ord"),
      orderNo: createOrderNumber(orders.length),
      status: values.status,
      createdAt: new Date().toISOString(),
      dueAt: new Date(values.dueAt).toISOString(),
      customerId: customerId ?? createId("cust"),
      items: [],
      designNotes: values.designNotes ?? "",
      inscriptionText: "",
      allergens: "",
      references,
      pickupOrDelivery: values.pickupOrDelivery,
      address: values.address ?? "",
      deliveryFee: 0,
      price: {
        subtotal: values.priceTotal,
        discount: 0,
        delivery: 0,
        total: values.priceTotal,
      },
      payments: [
        {
          id: createId("pay"),
          type: "deposit",
          amount: values.deposit,
          at: new Date().toISOString(),
          method: "manual",
        },
      ],
      cost: {
        ingredientsCost: 0,
        packagingCost: 0,
        laborCost: 0,
        totalCost: 0,
      },
      profit: {
        grossProfit: values.priceTotal,
        marginPct: 100,
      },
      checklist: (values.checklist ?? "")
        .split("\n")
        .filter(Boolean)
        .map((text) => ({ id: createId("check"), text, done: false })),
      timeline: [
        { id: createId("time"), at: new Date().toISOString(), text: t.orders.timelineCreated },
      ],
    };

    await addOrder(newOrder);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-medium",
              index === step
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.orders.form.customerNameLabel}</label>
          <Input placeholder={t.orders.form.customerNamePlaceholder} {...register("customerName")} />
          {errors.customerName ? (
            <p className="text-xs text-rose-500">{errors.customerName.message}</p>
          ) : null}
          <label className="text-sm font-medium">{t.orders.form.dueDateLabel}</label>
          <Input type="date" {...register("dueAt")} />
          {errors.dueAt ? (
            <p className="text-xs text-rose-500">{errors.dueAt.message}</p>
          ) : null}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.orders.form.statusLabel}</label>
          <select
            className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
            {...register("status")}
          >
            <option value="draft">{t.orders.statusLabels.draft}</option>
            <option value="confirmed">{t.orders.statusLabels.confirmed}</option>
            <option value="in-progress">{t.orders.statusLabels["in-progress"]}</option>
            <option value="ready">{t.orders.statusLabels.ready}</option>
            <option value="completed">{t.orders.statusLabels.completed}</option>
          </select>
          <label className="text-sm font-medium">{t.orders.form.pickupOrDeliveryLabel}</label>
          <select
            className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
            {...register("pickupOrDelivery")}
          >
            <option value="pickup">{t.orders.fulfillment.pickup}</option>
            <option value="delivery">{t.orders.fulfillment.delivery}</option>
          </select>
          <label className="text-sm font-medium">{t.orders.form.addressLabel}</label>
          <Input placeholder={t.orders.form.addressPlaceholder} {...register("address")} />
          <label className="text-sm font-medium">{t.orders.form.designNotesLabel}</label>
          <Input placeholder={t.orders.form.designNotesPlaceholder} {...register("designNotes")} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.orders.form.totalPriceLabel}</label>
          <Input type="number" step="0.01" {...register("priceTotal")} />
          <label className="text-sm font-medium">{t.orders.form.depositLabel}</label>
          <Input type="number" step="0.01" {...register("deposit")} />
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {t.orders.form.remainingBalanceLabel}{" "}
            <span className="font-semibold">
              {formatCurrency(depositRemaining, settings?.currency)}
            </span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {t.orders.form.paymentsNote}
          </p>
          <div className="rounded-2xl border border-dashed border-slate-200/70 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700/70">
            {t.orders.form.paymentsPlaceholder}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">{t.orders.form.checklistLabel}</label>
          <textarea
            className="h-32 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
            placeholder={t.orders.form.checklistPlaceholder}
            {...register("checklist")}
          />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <input type="file" accept="image/*" onChange={handleFile} />
          <div className="grid gap-3 sm:grid-cols-2">
            {references.map((ref) => (
              <div
                key={ref.id}
                className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 text-sm dark:border-slate-700/70 dark:bg-slate-900/70"
              >
                <img
                  src={ref.urlOrData}
                  alt={ref.name}
                  className="h-28 w-full rounded-xl object-cover"
                />
                <p className="mt-2 truncate text-xs text-slate-500">{ref.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
          disabled={step === 0}
        >
          {t.orders.form.back}
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep((prev) => prev + 1)}>
            {t.orders.form.next}
          </Button>
        ) : (
          <Button type="submit">{t.orders.form.saveOrder}</Button>
        )}
      </div>
    </form>
  );
}
