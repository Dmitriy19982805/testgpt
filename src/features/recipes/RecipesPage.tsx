import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { db } from "../../db";
import { createId } from "../../utils/ids";
import type { Recipe } from "../../db/types";
import { formatCurrency } from "../../utils/currency";

export function RecipesPage() {
  const { recipes, ingredients, loadAll, settings } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [yieldKg, setYieldKg] = useState(1);
  const [ingredientQty, setIngredientQty] = useState<Record<string, number>>({});

  const handleSave = async () => {
    const recipe: Recipe = {
      id: createId("rec"),
      name,
      yieldKg,
      ingredients: Object.entries(ingredientQty)
        .filter(([, qty]) => qty > 0)
        .map(([ingredientId, qty]) => ({ ingredientId, qty })),
      notes: "",
    };
    await db.recipes.put(recipe);
    await loadAll();
    setName("");
    setYieldKg(1);
    setIngredientQty({});
    setShowForm(false);
  };

  const costLookup = useMemo(() => {
    return ingredients.reduce((acc, ingredient) => {
      acc[ingredient.id] = ingredient.pricePerUnit;
      return acc;
    }, {} as Record<string, number>);
  }, [ingredients]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recipes"
        description="Calculate ingredient costs and standardize your best sellers."
        action={
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? "Close" : "New recipe"}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6 space-y-4">
          <Input
            placeholder="Recipe name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            type="number"
            step="0.1"
            value={yieldKg}
            onChange={(event) => setYieldKg(Number(event.target.value))}
            placeholder="Yield (kg)"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Ingredients</p>
            {ingredients.length === 0 ? (
              <p className="text-sm text-slate-500">
                Add ingredients first to build recipes.
              </p>
            ) : (
              ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center gap-3">
                  <span className="min-w-[120px] text-sm">{ingredient.name}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={ingredientQty[ingredient.id] ?? 0}
                    onChange={(event) =>
                      setIngredientQty((prev) => ({
                        ...prev,
                        [ingredient.id]: Number(event.target.value),
                      }))
                    }
                  />
                  <span className="text-xs text-slate-500">{ingredient.unit}</span>
                </div>
              ))
            )}
          </div>
          <Button onClick={handleSave} disabled={!name}>
            Save recipe
          </Button>
        </GlassCard>
      ) : null}

      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          description="Create standard recipes with cost breakdowns."
          actionLabel="New recipe"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recipes.map((recipe) => {
            const ingredientCost = recipe.ingredients.reduce(
              (acc, ingredient) => acc + (costLookup[ingredient.ingredientId] ?? 0) * ingredient.qty,
              0
            );
            const costPerKg = ingredientCost / Math.max(recipe.yieldKg, 1);
            return (
              <GlassCard key={recipe.id} className="p-5">
                <h3 className="text-lg font-semibold">{recipe.name}</h3>
                <p className="text-sm text-slate-500">Yield {recipe.yieldKg} kg</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>Ingredient cost: {formatCurrency(ingredientCost, settings?.currency)}</p>
                  <p>Cost per kg: {formatCurrency(costPerKg, settings?.currency)}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
