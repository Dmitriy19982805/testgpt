import { useState } from "react";
import { Button } from "../../components/ui/button";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { useAppStore } from "../../store/useAppStore";
import type { Settings } from "../../db/types";
import { t } from "../../i18n";

interface SettingsPageProps {
  auth: { logout: () => void };
}

export function SettingsPage({ auth }: SettingsPageProps) {
  const { settings, saveSettings } = useAppStore();
  const [businessName, setBusinessName] = useState(settings?.businessName ?? "");
  const [currency, setCurrency] = useState(settings?.currency ?? "RUB");
  const [capacity, setCapacity] = useState(settings?.dayCapacityRules ?? 5);
  const [pin, setPin] = useState(settings?.pin ?? "1234");

  const handleSave = async () => {
    if (!settings) return;
    const next: Settings = {
      ...settings,
      businessName,
      currency,
      dayCapacityRules: capacity,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

      <GlassCard className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Название бизнеса</label>
          <Input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder={t.settings.placeholders.businessName}
          />
          <p className="text-xs text-slate-500">Название мастерской или бренда</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Валюта</label>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
          >
            <option value="RUB">RUB (₽)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
          <p className="text-xs text-slate-500">Используется в заказах и отчетах</p>
        </div>
        <div className="space-y-2">
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
        <div className="space-y-2">
          <label className="text-sm font-medium">PIN-код</label>
          <Input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder={t.settings.placeholders.adminPin}
          />
          <p className="text-xs text-slate-500">Нужен для доступа к защищенным разделам</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div>
            <p className="text-sm font-medium">{t.settings.theme.label}</p>
            <p className="text-xs text-slate-500">{t.settings.theme.hint}</p>
          </div>
          <Switch checked={settings?.theme === "dark"} onClick={handleThemeToggle} />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={handleSave}>{t.settings.actions.save}</Button>
          <Button variant="outline" onClick={auth.logout}>
            {t.settings.actions.logout}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
