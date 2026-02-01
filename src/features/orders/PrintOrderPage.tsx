import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../../components/ui/button";
import { formatDate } from "../../utils/date";

export function PrintOrderPage() {
  const { id } = useParams();
  const { orders, customers } = useAppStore();
  const order = useMemo(() => orders.find((item) => item.id === id), [orders, id]);
  const customer = customers.find((c) => c.id === order?.customerId);

  if (!order) {
    return (
      <div className="space-y-4">
        <p>Order not found.</p>
        <Link to="/app/orders">
          <Button>Back to orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-900 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Order summary</p>
          <h1 className="text-2xl font-semibold">{order.orderNo}</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500">Customer</h2>
          <p className="mt-2 text-lg font-medium">{customer?.name ?? "Walk-in"}</p>
          <p className="text-sm text-slate-500">{customer?.phone}</p>
          <p className="text-sm text-slate-500">{customer?.email}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500">Details</h2>
          <p className="mt-2 text-sm">Due: {formatDate(order.dueAt)}</p>
          <p className="text-sm">Status: {order.status}</p>
          <p className="text-sm">Fulfillment: {order.pickupOrDelivery}</p>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-500">Notes</h2>
        <p className="mt-2 text-sm">{order.designNotes || "No design notes"}</p>
        <p className="mt-2 text-sm">Inscription: {order.inscriptionText || "None"}</p>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-500">Checklist</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
          {order.checklist.length === 0 ? (
            <li>No checklist items.</li>
          ) : (
            order.checklist.map((item) => <li key={item.id}>{item.text}</li>)
          )}
        </ul>
      </div>
    </div>
  );
}
