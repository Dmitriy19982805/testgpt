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
        title="Ingredients"
        description="Track ingredient costs and pricing per unit."
        action={
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Close" : "Add ingredient"}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6 space-y-3">
          <Input
            placeholder="Ingredient name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder="Unit (kg, lb, oz)"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Price per unit"
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
          <Button onClick={handleSave} disabled={!name}>
            Save ingredient
          </Button>
        </GlassCard>
      ) : null}

      {ingredients.length === 0 ? (
        <EmptyState
          title="No ingredients yet"
          description="Add the raw materials to calculate recipe costs."
          actionLabel="Add ingredient"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ingredients.map((ingredient) => (
            <GlassCard key={ingredient.id} className="p-5">
              <h3 className="text-lg font-semibold">{ingredient.name}</h3>
              <p className="text-sm text-slate-500">
                {ingredient.pricePerUnit} per {ingredient.unit}
              </p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
