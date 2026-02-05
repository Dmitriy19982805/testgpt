import { CenterModal } from "../../components/common/CenterModal";
import type { Customer } from "../../db/types";
import { CustomerForm } from "./CustomerForm";

interface NewCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

export function NewCustomerModal({ open, onClose, onCreated }: NewCustomerModalProps) {
  return (
    <CenterModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title="Новый клиент"
      className="w-full max-w-lg rounded-2xl border border-white/40 bg-white/95 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] dark:border-slate-800/70 dark:bg-slate-900/80"
      containerClassName="fixed inset-0 z-[9999] overflow-y-auto"
      showCloseButton
    >
      <CustomerForm
        onSaved={(customer) => {
          onCreated(customer);
        }}
      />
    </CenterModal>
  );
}
