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
import { resolveDueTime, toDueAtIso } from "../../utils/date";
import { NewCustomerModal } from "../customers/NewCustomerModal";
import {
  formatProductTypeLabel,
  getProductTypeKey,
  getProductTypesFromRecipes,
  getRecipeCosts,
  normalizeProductType,
} from "../recipes/recipeUtils";

const schema = z
  .object({
    customerName: z.string().min(2, t.orders.form.customerNameRequired),
    customerId: z.string().optional(),
    dueAt: z.string().min(1, t.orders.form.dueDateRequired),
    dueTime: z.string().optional(),
    status: z.enum(["draft", "confirmed", "in-progress", "ready", "completed"]),
    pickupOrDelivery: z.enum(["pickup", "delivery"]),
    address: z.string().optional(),
    dessertType: z.string().optional(),
    recipeId: z.string().optional(),
    flavor: z.string().optional(),
    size: z.string().optional(),
    inscriptionText: z.string().optional(),
    decorationNotes: z.string().optional(),
    designNotes: z.string().optional(),
    priceTotal: z.coerce.number().min(0),
    deposit: z.coerce.number().min(0),
  })
  .superRefine((values, ctx) => {
    const total = Number(values.priceTotal) || 0;
    const deposit = Number(values.deposit) || 0;
    if (deposit > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deposit"],
        message: "Аванс не может быть больше итоговой цены.",
      });
    }
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

interface OrderFormContentProps extends OrderFormProps {
  className?: string;
  layout?: "default" | "modal";
  onClose?: () => void;
}

export function OrderFormContent({
  onCreated,
  onUpdated,
  initialOrder,
  className,
  layout = "default",
  onClose,
}: OrderFormContentProps) {
  const { customers, orders, recipes, ingredients, addOrder, updateOrder, settings } = useAppStore();
  const [step, setStep] = useState(0);
  const [references, setReferences] = useState<
    { id: string; name: string; urlOrData: string }[]
  >([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);

  const defaultValues = useMemo(
    () => ({
      customerName:
        initialOrder?.customerName ??
        customers.find((customer) => customer.id === initialOrder?.customerId)?.name ??
        "",
      customerId: initialOrder?.customerId ?? "",
      dueAt: initialOrder ? initialOrder.dueAt.slice(0, 10) : "",
      dueTime: resolveDueTime(initialOrder?.dueTime),
      status: toFormStatus(initialOrder?.status ?? "confirmed"),
      pickupOrDelivery: initialOrder?.pickupOrDelivery ?? "pickup",
      address: initialOrder?.address ?? "",
      dessertType: initialOrder?.dessertType ?? "",
      recipeId: initialOrder?.recipeId ?? "",
      flavor: initialOrder?.flavor ?? "",
      size: initialOrder?.size ?? "",
      inscriptionText: initialOrder?.inscriptionText ?? "",
      decorationNotes: initialOrder?.decorationNotes ?? "",
      designNotes: initialOrder?.designNotes ?? "",
      priceTotal: initialOrder?.price.total ?? 0,
      deposit:
        initialOrder?.payments.find((payment) => payment.type === "deposit")?.amount ?? 0,
    }),
    [customers, initialOrder]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    reset(defaultValues);
    setReferences(initialOrder?.references ?? []);
  }, [defaultValues, initialOrder, reset]);

  useEffect(() => {
    register("customerName");
    register("customerId");
  }, [register]);

  const priceTotal = watch("priceTotal");
  const deposit = watch("deposit");
  const pickupOrDelivery = watch("pickupOrDelivery");
  const dessertType = watch("dessertType");
  const recipeId = watch("recipeId");
  const flavor = watch("flavor");
  const size = watch("size");
  const total = Number(priceTotal) || 0;
  const paid = Number(deposit) || 0;
  const remaining = Math.max(total - paid, 0);
  const isDepositOver = paid > total;

  const normalizePhone = (value: string) => value.replace(/[\s()+-]/g, "");
  const customerQuery = watch("customerName") ?? "";
  const isFirstStep = step === 0;
  const canCloseOnFirstStep = layout === "modal" && Boolean(onClose);
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = customerQuery.trim().toLowerCase();
    const normalizedPhoneQuery = normalizePhone(customerQuery);
    if (!normalizedQuery) {
      return customers;
    }
    return customers.filter((customer) => {
      const matchesName = customer.name.toLowerCase().includes(normalizedQuery);
      const matchesSecondaryContact = (customer.secondaryContact ?? "")
        .toLowerCase()
        .includes(normalizedQuery);
      const normalizedPhone = normalizePhone(customer.phone ?? "");
      const matchesPhone = normalizedPhone.includes(normalizedPhoneQuery);
      return matchesName || matchesPhone || matchesSecondaryContact;
    });
  }, [customerQuery, customers]);

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
    const trimmedCustomerName = values.customerName.trim();
    const selectedCustomer = customers.find((c) => c.id === values.customerId);
    const customerId = selectedCustomer?.id ?? "";
    const customerName = selectedCustomer?.name ?? trimmedCustomerName;
    const dueTime = resolveDueTime(values.dueTime);
    const dueAt = toDueAtIso(values.dueAt, dueTime);
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
        dueAt,
        dueTime,
        customerId,
        customerName,
        dessertType: normalizeProductType(values.dessertType) ?? "",
        recipeId: values.recipeId ?? "",
        flavor: values.flavor ?? "",
        size: values.size ?? "",
        inscriptionText: values.inscriptionText ?? "",
        decorationNotes: values.decorationNotes ?? "",
        designNotes: values.designNotes ?? "",
        pickupOrDelivery: values.pickupOrDelivery,
        address: values.address ?? "",
        price: {
          ...initialOrder.price,
          subtotal: values.priceTotal,
          total: values.priceTotal,
        },
        payments: nextPayments,
        checklist: initialOrder.checklist,
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
      dueAt,
      dueTime,
      customerId,
      customerName,
      dessertType: normalizeProductType(values.dessertType) ?? "",
      recipeId: values.recipeId ?? "",
      flavor: values.flavor ?? "",
      size: values.size ?? "",
      inscriptionText: values.inscriptionText ?? "",
      decorationNotes: values.decorationNotes ?? "",
      items: [],
      designNotes: values.designNotes ?? "",
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
      checklist: [],
      timeline: [
        { id: createId("time"), at: new Date().toISOString(), text: t.orders.timelineCreated },
      ],
    };

    await addOrder(newOrder);
    onCreated?.();
  };

  const isLastStep = step === steps.length - 1;
  const handleSave = handleSubmit((values) => onSubmit(values));
  const handleSaveDraft = handleSubmit((values) =>
    onSubmit({ ...values, status: "draft" })
  );
  const handleSelectCustomer = (customer: { id: string; name: string }) => {
    setValue("customerId", customer.id, { shouldValidate: true });
    setValue("customerName", customer.name, { shouldValidate: true });
    setIsCustomerListOpen(false);
  };
  const handleCustomerInputChange = (value: string) => {
    setValue("customerName", value, { shouldValidate: true });
    setValue("customerId", "", { shouldValidate: false });
  };

  const sectionClass =
    "rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60";

  const isModalLayout = layout === "modal";
  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId);
  const productTypeOptions = useMemo(() => getProductTypesFromRecipes(recipes), [recipes]);
  const normalizedSelectedDessertType = useMemo(
    () => normalizeProductType(dessertType),
    [dessertType]
  );
  const selectedDessertTypeKey = useMemo(
    () => getProductTypeKey(normalizedSelectedDessertType ?? undefined),
    [normalizedSelectedDessertType]
  );
  const filteredRecipes = useMemo(() => {
    if (!selectedDessertTypeKey) {
      return [];
    }

    return recipes
      .filter((recipe) => getProductTypeKey(recipe.category) === selectedDessertTypeKey)
      .sort((left, right) => left.name.localeCompare(right.name, "ru-RU", { sensitivity: "base" }));
  }, [recipes, selectedDessertTypeKey]);
  const hasNoProductTypes = productTypeOptions.length === 0;
  const hasStaleDessertType = Boolean(
    normalizedSelectedDessertType &&
      !productTypeOptions.some(
        (option) => getProductTypeKey(option.value) === selectedDessertTypeKey
      )
  );
  const isRecipeSelectionDisabled = hasNoProductTypes || !selectedDessertTypeKey;
  const dessertSizePlaceholder = useMemo(() => {
    switch (dessertType) {
      case "Торт":
        return "Например, 1.5 кг или 18 см";
      case "Бенто":
        return "Например, 10–12 см";
      case "Капкейки":
        return "Например, 12 шт";
      case "Макаронс":
        return "Например, 24 шт";
      case "Десертный бокс":
        return "Например, 6 шт";
      case "Другое":
        return "Опишите размер";
      default:
        return "Выберите тип, чтобы увидеть подсказку";
    }
  }, [dessertType]);

  const parseOrderSizeValue = (raw: string, recipeUnitLabel: string): number => {
    const normalized = raw.replace(",", ".").toLowerCase();
    const match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) {
      return 0;
    }
    const value = Number(match[0]);
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    if (recipeUnitLabel === "г") {
      return normalized.includes("кг") ? value * 1000 : value;
    }
    return value;
  };

  useEffect(() => {
    if (recipeId && selectedRecipe && !flavor) {
      setValue("flavor", selectedRecipe.name, { shouldValidate: false });
    }
  }, [flavor, recipeId, selectedRecipe, setValue]);

  useEffect(() => {
    if (!selectedRecipe) {
      return;
    }

    const recipeCosts = getRecipeCosts(selectedRecipe, ingredients);
    if (recipeCosts.costPerResultUnit <= 0) {
      return;
    }

    const sizeValue = parseOrderSizeValue(size ?? "", recipeCosts.resultUnitLabel);
    if (sizeValue <= 0) {
      return;
    }

    setValue("priceTotal", Number((sizeValue * recipeCosts.costPerResultUnit).toFixed(2)), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [ingredients, selectedRecipe, setValue, size]);

  useEffect(() => {
    if (dessertType && normalizedSelectedDessertType && dessertType !== normalizedSelectedDessertType) {
      setValue("dessertType", normalizedSelectedDessertType, { shouldValidate: false });
    }
  }, [dessertType, normalizedSelectedDessertType, setValue]);

  useEffect(() => {
    if (!recipeId) {
      return;
    }

    const recipeMatchesDessertType = recipes.some(
      (recipe) => recipe.id === recipeId && getProductTypeKey(recipe.category) === selectedDessertTypeKey
    );

    if (!recipeMatchesDessertType) {
      setValue("recipeId", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [recipeId, recipes, selectedDessertTypeKey, setValue]);

  return (
    <form
      onSubmit={handleSave}
      className={cn(
        isModalLayout ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4",
        className
      )}
    >
      <div className={cn("flex flex-wrap gap-2", sectionClass, isModalLayout && "shrink-0")}>
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

      <div
        className={cn(
          isModalLayout ? "min-h-[360px] flex-1 overflow-y-auto pr-1" : "space-y-4"
        )}
      >
        <div className={cn(isModalLayout && "space-y-4")}>
          {step === 0 && (
            <div className={cn("space-y-3", sectionClass)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium">Клиент</label>
                <Button type="button" variant="subtle" onClick={() => setShowCustomerForm(true)}>
                  Новый клиент
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="Начните вводить имя..."
                  value={customerQuery}
                  onChange={(event) => handleCustomerInputChange(event.target.value)}
                  onFocus={() => setIsCustomerListOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsCustomerListOpen(false), 120);
                  }}
                />
                {isCustomerListOpen && filteredCustomers.length > 0 ? (
                  <div className="absolute z-10 mt-2 w-full rounded-2xl border border-slate-200/70 bg-white/95 p-2 text-sm shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() =>
                          handleSelectCustomer({ id: customer.id, name: customer.name })
                        }
                      >
                        <p className="font-medium">{customer.name}</p>
                        {customer.phone || customer.secondaryContact ? (
                          <p className="text-xs text-slate-500">
                            {[customer.phone, customer.secondaryContact]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {errors.customerName ? (
                <p className="text-xs text-rose-500">{errors.customerName.message}</p>
              ) : null}
              <div className="space-y-2">
                <p className="text-sm font-medium">Сдача заказа</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">
                      {t.orders.form.dueDateLabel}
                    </label>
                    <Input type="date" {...register("dueAt")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Время готовности</label>
                    <Input type="time" {...register("dueTime")} />
                  </div>
                </div>
                {errors.dueAt ? (
                  <p className="text-xs text-rose-500">{errors.dueAt.message}</p>
                ) : null}
              </div>
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
              <label className="text-sm font-medium">
                {t.orders.form.pickupOrDeliveryLabel}
              </label>
              <select
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
                {...register("pickupOrDelivery")}
              >
                <option value="pickup">{t.orders.fulfillment.pickup}</option>
                <option value="delivery">{t.orders.fulfillment.delivery}</option>
              </select>
              {pickupOrDelivery === "delivery" ? (
                <>
                  <label className="text-sm font-medium">{t.orders.form.addressLabel}</label>
                  <Input placeholder={t.orders.form.addressPlaceholder} {...register("address")} />
                </>
              ) : null}
            </div>
          )}

          {step === 1 && (
            <div className={cn("space-y-3", sectionClass)}>
              <div className="space-y-2">
                <p className="text-sm font-medium">Десерт</p>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Тип десерта</label>
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/80"
                    disabled={hasNoProductTypes}
                    {...register("dessertType")}
                  >
                    <option value="">
                      {hasNoProductTypes
                        ? "Нет типов изделий — добавьте рецепт"
                        : "Выберите тип"}
                    </option>
                    {hasStaleDessertType && normalizedSelectedDessertType ? (
                      <option value={normalizedSelectedDessertType}>
                        {formatProductTypeLabel(normalizedSelectedDessertType)} (устар.)
                      </option>
                    ) : null}
                    {productTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Рецепт</label>
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/70 dark:bg-slate-900/80"
                    disabled={isRecipeSelectionDisabled}
                    {...register("recipeId")}
                  >
                    <option value="">Без рецепта</option>
                    {filteredRecipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                  {isRecipeSelectionDisabled ? (
                    <p className="text-xs text-slate-500">Сначала выберите тип десерта</p>
                  ) : null}
                  {selectedRecipe ? (() => {
                    const recipeCosts = getRecipeCosts(selectedRecipe, ingredients);
                    return recipeCosts.costPerResultUnit > 0 ? (
                      <p className="text-xs text-slate-500">Себестоимость за 1 {recipeCosts.resultUnitLabel}: {formatCurrency(recipeCosts.costPerResultUnit, settings?.currency)}</p>
                    ) : null;
                  })() : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Вкус</label>
                  <Input
                    placeholder="Например, ваниль, клубника, шоколад"
                    {...register("flavor")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Размер</label>
                  <Input placeholder={dessertSizePlaceholder} {...register("size")} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Оформление</p>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Надпись</label>
                  <Input
                    placeholder="Текст надписи (если нужна)"
                    {...register("inscriptionText")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Декор</label>
                  <Input
                    placeholder="Короткие заметки по декору"
                    {...register("decorationNotes")}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={cn("space-y-3", sectionClass)}>
              <label className="text-sm font-medium">{t.orders.form.totalPriceLabel}</label>
              <Input type="number" step="0.01" {...register("priceTotal")} />
              <label className="text-sm font-medium">{t.orders.form.depositLabel}</label>
              <Input type="number" step="0.01" {...register("deposit")} />
              {errors.deposit ? (
                <p className="text-xs text-rose-500">{errors.deposit.message}</p>
              ) : null}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm",
                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                )}
              >
                {t.orders.form.remainingBalanceLabel}{" "}
                <span className="font-semibold">
                  {formatCurrency(remaining, settings?.currency)}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={cn("space-y-3", sectionClass)}>
              <label className="text-sm font-medium">{t.orders.form.notesLabel}</label>
              <textarea
                className="h-32 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm dark:border-slate-700/70 dark:bg-slate-900/80"
                placeholder={t.orders.form.notesPlaceholder}
                {...register("designNotes")}
              />
            </div>
          )}

          {step === 4 && (
            <div className={cn("space-y-4", sectionClass)}>
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
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          sectionClass,
          isModalLayout && "shrink-0"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (isFirstStep && canCloseOnFirstStep) {
              onClose?.();
              return;
            }
            setStep((prev) => Math.max(prev - 1, 0));
          }}
          disabled={isFirstStep && !canCloseOnFirstStep}
        >
          {isFirstStep && canCloseOnFirstStep ? t.orders.actions.close : t.orders.form.back}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="subtle" onClick={handleSaveDraft} disabled={isDepositOver}>
            {t.orders.form.saveDraft}
          </Button>
          <Button
            type="submit"
            variant={isLastStep ? "default" : "subtle"}
            disabled={isDepositOver}
          >
            {t.orders.form.saveOrder}
          </Button>
          {!isLastStep ? (
            <Button
              type="button"
              variant="default"
              onClick={() => setStep((prev) => prev + 1)}
            >
              {t.orders.form.next}
            </Button>
          ) : null}
        </div>
      </div>

      <NewCustomerModal
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        onCreated={(customer) => {
          handleSelectCustomer({ id: customer.id, name: customer.name });
          setShowCustomerForm(false);
        }}
      />
    </form>
  );
}

export function OrderForm({ onCreated, onUpdated, initialOrder }: OrderFormProps) {
  return (
    <OrderFormContent
      onCreated={onCreated}
      onUpdated={onUpdated}
      initialOrder={initialOrder}
    />
  );
}
