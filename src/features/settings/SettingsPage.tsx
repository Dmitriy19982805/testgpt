import { useState } from "react";
import { Button } from "../../components/ui/button";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { useAppStore } from "../../store/useAppStore";
import { db } from "../../db";
import type { Settings } from "../../db/types";
import { t } from "../../i18n";

interface SettingsPageProps {
  auth: { logout: () => void };
}

export function SettingsPage({ auth }: SettingsPageProps) {
  const { settings, saveSettings, seedDemo, clearAll, loadAll } = useAppStore();
  const [businessName, setBusinessName] = useState(settings?.businessName ?? "");
  const [currency, setCurrency] = useState(settings?.currency ?? "RUB");
  const [capacity, setCapacity] = useState(settings?.dayCapacityRules ?? 5);
  const [depositPct, setDepositPct] = useState(settings?.defaultDepositPct ?? 40);
  const [pin, setPin] = useState(settings?.pin ?? "1234");

  const handleSave = async () => {
    if (!settings) return;
    const next: Settings = {
      ...settings,
      businessName,
      currency,
      dayCapacityRules: capacity,
      defaultDepositPct: depositPct,
      pin,
    };
    await saveSettings(next);
  };

  const handleThemeToggle = async () => {
    if (!settings) return;
    await saveSettings({
      ...settings,
      theme: settings.theme === "dark" ? "light" : "dark",
    });
  };

  const handleExport = async () => {
    const payload = {
      customers: await db.customers.toArray(),
      orders: await db.orders.toArray(),
      ingredients: await db.ingredients.toArray(),
      recipes: await db.recipes.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = t.settings.backup.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    await db.transaction(
      "rw",
      [db.customers, db.orders, db.ingredients, db.recipes, db.settings],
      async () => {
        await db.customers.clear();
        await db.orders.clear();
        await db.ingredients.clear();
        await db.recipes.clear();
        await db.settings.clear();
        await db.customers.bulkAdd(payload.customers ?? []);
        await db.orders.bulkAdd(payload.orders ?? []);
        await db.ingredients.bulkAdd(payload.ingredients ?? []);
        await db.recipes.bulkAdd(payload.recipes ?? []);
        await db.settings.bulkAdd(payload.settings ?? []);
      }
    );
    await loadAll();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t.settings.theme.label}</p>
            <p className="text-xs text-slate-500">{t.settings.theme.hint}</p>
          </div>
          <Switch checked={settings?.theme === "dark"} onClick={handleThemeToggle} />
        </div>
        <Input
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder={t.settings.placeholders.businessName}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
          >
            <option value="RUB">RUB (₽)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
          <div className="space-y-1">
            <label className="text-sm font-medium">Максимум заказов в день</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              placeholder={t.settings.placeholders.dayCapacity}
            />
            <p className="text-xs text-slate-500">
              Используется для контроля загрузки календаря
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Предоплата по умолчанию (%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={depositPct}
              onChange={(event) => setDepositPct(Number(event.target.value))}
              placeholder={t.settings.placeholders.defaultDeposit}
            />
            <p className="text-xs text-slate-500">
              Процент от суммы заказа, подставляется автоматически
            </p>
          </div>
        </div>
        <Input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder={t.settings.placeholders.adminPin}
        />
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave}>{t.settings.actions.save}</Button>
          <Button variant="outline" onClick={auth.logout}>
            {t.settings.actions.logout}
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6 space-y-3">
          <h3 className="text-lg font-semibold">{t.settings.demo.title}</h3>
          <p className="text-sm text-slate-500">
            {t.settings.demo.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={seedDemo}>{t.settings.demo.seed}</Button>
            <Button variant="ghost" onClick={clearAll}>
              {t.settings.demo.clear}
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-3">
          <h3 className="text-lg font-semibold">{t.settings.backup.title}</h3>
          <p className="text-sm text-slate-500">
            {t.settings.backup.description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              {t.settings.backup.export}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200/70 px-4 py-2 text-sm dark:border-slate-700/70">
              {t.settings.backup.import}
              <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
