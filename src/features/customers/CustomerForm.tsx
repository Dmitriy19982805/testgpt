import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useAppStore } from "../../store/useAppStore";
import { db } from "../../db";
import { createId } from "../../utils/ids";
import type { Customer } from "../../db/types";
import { t } from "../../i18n";

const minimumContactMessage = "Введите хотя бы имя или телефон/доп. контакт";

const schema = z
  .object({
    name: z.string().trim().min(2, t.customers.validation.nameRequired).or(z.literal("")),
    phone: z.string().trim().min(6, t.customers.validation.phoneRequired).or(z.literal("")),
    secondaryContact: z.string().trim().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    const hasMinimum = [values.name, values.phone, values.secondaryContact].some(
      (value) => value.trim().length > 0
    );
    if (!hasMinimum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: minimumContactMessage,
        path: [],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface CustomerFormProps {
  initialCustomer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerForm({ initialCustomer, onSaved }: CustomerFormProps) {
  const { loadAll } = useAppStore();
  const [showMinimumError, setShowMinimumError] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [nameValue, phoneValue, secondaryValue] = watch([
    "name",
    "phone",
    "secondaryContact",
  ]);
  const isMinimumFilled = useMemo(
    () =>
      [nameValue, phoneValue, secondaryValue].some(
        (value) => value?.trim().length
      ),
    [nameValue, phoneValue, secondaryValue]
  );

  useEffect(() => {
    if (isMinimumFilled) {
      setShowMinimumError(false);
    }
  }, [isMinimumFilled]);

  useEffect(() => {
    if (initialCustomer) {
      reset({
        name: initialCustomer.name,
        phone: initialCustomer.phone,
        secondaryContact: initialCustomer.secondaryContact ?? initialCustomer.email ?? "",
      });
      return;
    }

    reset({ name: "", phone: "", secondaryContact: "" });
  }, [initialCustomer, reset]);

  const onSubmit = async (values: FormValues) => {
    let customer: Customer;

    if (initialCustomer) {
      customer = {
        ...initialCustomer,
        name: values.name.trim(),
        phone: values.phone.trim(),
        secondaryContact: values.secondaryContact.trim() || "",
      };
    } else {
      customer = {
        id: createId("cust"),
        name: values.name.trim(),
        phone: values.phone.trim(),
        secondaryContact: values.secondaryContact.trim() || "",
        notes: "",
        tags: [],
        createdAt: new Date().toISOString(),
      };
    }

    await db.customers.put(customer);
    await loadAll();
    onSaved?.(customer);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Input placeholder={t.customers.placeholders.fullName} {...register("name")} />
      {errors.name ? <p className="text-xs text-rose-500">{errors.name.message}</p> : null}
      <Input placeholder={t.customers.placeholders.phone} {...register("phone")} />
      {errors.phone ? <p className="text-xs text-rose-500">{errors.phone.message}</p> : null}
      <label className="text-sm font-medium">{t.customers.labels.secondaryContact}</label>
      <Input
        placeholder={t.customers.placeholders.secondaryContact}
        {...register("secondaryContact")}
      />
      {errors.root?.message || showMinimumError ? (
        <p className="text-xs text-rose-500">
          {errors.root?.message ?? minimumContactMessage}
        </p>
      ) : null}
      <div className="relative">
        <Button type="submit" disabled={!isMinimumFilled} className="w-full">
          {t.customers.save}
        </Button>
        {!isMinimumFilled ? (
          <button
            type="button"
            onClick={() => setShowMinimumError(true)}
            className="absolute inset-0 cursor-not-allowed"
            aria-label={minimumContactMessage}
          />
        ) : null}
      </div>
    </form>
  );
}
