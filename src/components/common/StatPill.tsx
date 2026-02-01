interface StatPillProps {
  label: string;
  value: string;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="glass rounded-full px-4 py-2 text-sm text-slate-600 shadow-sm dark:text-slate-200">
      <span className="font-medium text-slate-900 dark:text-white">
        {value}
      </span>{" "}
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
