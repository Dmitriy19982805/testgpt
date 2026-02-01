import { useEffect } from "react";
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

const schema = z.object({
  name: z.string().min(2, t.customers.validation.nameRequired),
  phone: z.string().min(6, t.customers.validation.phoneRequired),
  email: z.string().email(t.customers.validation.emailRequired),
});

type FormValues = z.infer<typeof schema>;

interface CustomerFormProps {
  initialCustomer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerForm({ initialCustomer, onSaved }: CustomerFormProps) {
  const { loadAll } = useAppStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (initialCustomer) {
      reset({
        name: initialCustomer.name,
        phone: initialCustomer.phone,
        email: initialCustomer.email,
      });
      return;
    }

    reset({ name: "", phone: "", email: "" });
  }, [initialCustomer, reset]);

  const onSubmit = async (values: FormValues) => {
    let customer: Customer;

    if (initialCustomer) {
      customer = {
        ...initialCustomer,
        name: values.name,
        phone: values.phone,
        email: values.email,
      };
    } else {
      customer = {
        id: createId("cust"),
        name: values.name,
        phone: values.phone,
        email: values.email,
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
      <Input placeholder={t.customers.placeholders.email} {...register("email")} />
      {errors.email ? <p className="text-xs text-rose-500">{errors.email.message}</p> : null}
      <Button type="submit">{t.customers.save}</Button>
    </form>
  );
}
