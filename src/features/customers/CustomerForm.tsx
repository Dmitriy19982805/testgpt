import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useAppStore } from "../../store/useAppStore";
import type { Customer } from "../../db/types";
import { t } from "../../i18n";

const minimumContactMessage = "Введите хотя бы имя или телефон";

const schema = z
  .object({
    name: z.string().trim().min(2, t.customers.validation.nameRequired).or(z.literal("")),
    phone: z.string().trim().min(6, t.customers.validation.phoneRequired).or(z.literal("")),
    secondaryContact: z.string().trim().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    const hasMinimum = [values.name, values.phone].some((value) => value.trim().length > 0);
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
  const { addCustomer, updateCustomer } = useAppStore();
  const [showMinimumError, setShowMinimumError] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [nameValue, phoneValue] = watch(["name", "phone"]);
  const isMinimumFilled = useMemo(
    () => [nameValue, phoneValue].some((value) => value?.trim().length),
    [nameValue, phoneValue]
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
    const resolvedName = values.name.trim() || values.phone.trim();
    if (initialCustomer) {
      const customer: Customer = {
        ...initialCustomer,
        name: resolvedName,
        phone: values.phone.trim(),
        secondaryContact: values.secondaryContact.trim() || "",
      };
      await updateCustomer(customer);
      onSaved?.(customer);
      return;
    } else {
      const customer = await addCustomer({
        name: resolvedName,
        phone: values.phone.trim(),
        secondaryContact: values.secondaryContact.trim() || "",
        notes: "",
        tags: [],
      });
      onSaved?.(customer);
    }
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
