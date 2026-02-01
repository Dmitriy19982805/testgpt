import { useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
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
import { ActionMenu } from "../../components/common/ActionMenu";
import { DrawerSheet } from "../../components/common/DrawerSheet";

const schema = z.object({
  name: z.string().min(2, t.customers.validation.nameRequired),
  phone: z.string().min(6, t.customers.validation.phoneRequired),
  email: z.string().email(t.customers.validation.emailRequired),
});

type FormValues = z.infer<typeof schema>;

export function CustomersPage() {
  const { customers, orders, loadAll, deleteCustomer } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [actionCustomerId, setActionCustomerId] = useState<string | null>(null);
  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: values.name,
        phone: values.phone,
        email: values.email,
      };
      await db.customers.put(updated);
      await loadAll();
      reset();
      setShowForm(false);
      setEditingCustomer(null);
      return;
    }

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

  const handleDelete = async (customer: Customer) => {
    const hasOrders = orders.some((order) => order.customerId === customer.id);
    if (hasOrders) {
      window.alert("Нельзя удалить клиента: есть связанные заказы.");
      return;
    }
    const confirmed = window.confirm(`Удалить клиента ${customer.name}?`);
    if (!confirmed) {
      return;
    }
    await deleteCustomer(customer.id);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    });
    setShowForm(true);
    setActionCustomerId(null);
  };

  const openNewCustomer = () => {
    setEditingCustomer(null);
    reset();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    reset();
  };

  const handleToggleForm = () => {
    if (showForm) {
      closeForm();
      return;
    }
    openNewCustomer();
  };

  const activeCustomer = actionCustomerId
    ? customers.find((customer) => customer.id === actionCustomerId)
    : null;
  const activeAnchor = actionCustomerId ? actionButtonRefs.current[actionCustomerId] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.customers.title}
        description={t.customers.description}
        action={
          <Button onClick={handleToggleForm}>
            {showForm ? t.customers.actions.close : t.customers.actions.add}
          </Button>
        }
      />

      <DrawerSheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        title={editingCustomer ? "Редактирование клиента" : "Новый клиент"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input placeholder={t.customers.placeholders.fullName} {...register("name")} />
          {errors.name ? <p className="text-xs text-rose-500">{errors.name.message}</p> : null}
          <Input placeholder={t.customers.placeholders.phone} {...register("phone")} />
          {errors.phone ? <p className="text-xs text-rose-500">{errors.phone.message}</p> : null}
          <Input placeholder={t.customers.placeholders.email} {...register("email")} />
          {errors.email ? <p className="text-xs text-rose-500">{errors.email.message}</p> : null}
          <Button type="submit">{t.customers.save}</Button>
        </form>
      </DrawerSheet>

      {customers.length === 0 ? (
        <EmptyState
          title={t.customers.empty.title}
          description={t.customers.empty.description}
          actionLabel={t.customers.empty.action}
          onAction={openNewCustomer}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((customer) => (
            <GlassCard key={customer.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  <p className="text-sm text-slate-500">{customer.phone}</p>
                  <p className="text-sm text-slate-500">{customer.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                  ref={(node) => {
                    actionButtonRefs.current[customer.id] = node;
                  }}
                  onClick={() => setActionCustomerId(customer.id)}
                  aria-label="Действия с клиентом"
                >
                  <Pencil size={16} />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <ActionMenu
        open={Boolean(activeCustomer)}
        anchorEl={activeAnchor}
        onOpenChange={(open) => {
          if (!open) {
            setActionCustomerId(null);
          }
        }}
        onEdit={() => {
          if (activeCustomer) {
            handleEdit(activeCustomer);
          }
        }}
        onDelete={() => {
          if (activeCustomer) {
            void handleDelete(activeCustomer);
          }
        }}
      />
    </div>
  );
}
