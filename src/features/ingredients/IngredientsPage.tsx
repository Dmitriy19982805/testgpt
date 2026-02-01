import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { db } from "../../db";
import { createId } from "../../utils/ids";
import type { Ingredient } from "../../db/types";
import { t } from "../../i18n";

export function IngredientsPage() {
  const { ingredients, loadAll } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);

  const handleSave = async () => {
    const ingredient: Ingredient = {
      id: createId("ing"),
      name,
      unit,
      pricePerUnit: price,
    };
    await db.ingredients.put(ingredient);
    await loadAll();
    setName("");
    setUnit("kg");
    setPrice(0);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.ingredients.title}
        description={t.ingredients.description}
        action={
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? t.ingredients.actions.close : t.ingredients.actions.add}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6 space-y-3">
          <Input
            placeholder={t.ingredients.placeholders.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder={t.ingredients.placeholders.unit}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder={t.ingredients.placeholders.price}
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
          <Button onClick={handleSave} disabled={!name}>
            {t.ingredients.save}
          </Button>
        </GlassCard>
      ) : null}

      {ingredients.length === 0 ? (
        <EmptyState
          title={t.ingredients.empty.title}
          description={t.ingredients.empty.description}
          actionLabel={t.ingredients.empty.action}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ingredients.map((ingredient) => (
              <GlassCard key={ingredient.id} className="p-5">
                <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                <p className="text-sm text-slate-500">
                {ingredient.pricePerUnit} {t.ingredients.per} {ingredient.unit}
                </p>
              </GlassCard>
            ))}
        </div>
      )}
    </div>
  );
}
