import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
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

export function CustomersPage() {
  const { customers, loadAll } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const customer: Customer = {
      id: createId("cust"),
      name: values.name,
      phone: values.phone,
      email: values.email,
      notes: "",
      tags: [],
      createdAt: new Date().toISOString(),
    };
    await db.customers.put(customer);
    await loadAll();
    reset();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.customers.title}
        description={t.customers.description}
        action={
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? t.customers.actions.close : t.customers.actions.add}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Input placeholder={t.customers.placeholders.fullName} {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-rose-500">{errors.name.message}</p>
            ) : null}
            <Input placeholder={t.customers.placeholders.phone} {...register("phone")} />
            {errors.phone ? (
              <p className="text-xs text-rose-500">{errors.phone.message}</p>
            ) : null}
            <Input placeholder={t.customers.placeholders.email} {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-rose-500">{errors.email.message}</p>
            ) : null}
            <Button type="submit">{t.customers.save}</Button>
          </form>
        </GlassCard>
      ) : null}

      {customers.length === 0 ? (
        <EmptyState
          title={t.customers.empty.title}
          description={t.customers.empty.description}
          actionLabel={t.customers.empty.action}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((customer) => (
            <GlassCard key={customer.id} className="p-5">
              <h3 className="text-lg font-semibold">{customer.name}</h3>
              <p className="text-sm text-slate-500">{customer.phone}</p>
              <p className="text-sm text-slate-500">{customer.email}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
