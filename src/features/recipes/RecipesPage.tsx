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
import { t } from "../../i18n";

export function RecipesPage() {
  const { recipes, ingredients, loadAll, settings, deleteRecipe } = useAppStore();
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

  const handleDelete = async (recipe: Recipe) => {
    const confirmed = window.confirm(`Удалить рецепт ${recipe.name}?`);
    if (!confirmed) {
      return;
    }
    await deleteRecipe(recipe.id);
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
        title={t.recipes.title}
        description={t.recipes.description}
        action={
          <Button onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? t.recipes.actions.close : t.recipes.actions.new}
          </Button>
        }
      />

      {showForm ? (
        <GlassCard className="p-6 space-y-4">
          <Input
            placeholder={t.recipes.placeholders.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            type="number"
            step="0.1"
            value={yieldKg}
            onChange={(event) => setYieldKg(Number(event.target.value))}
            placeholder={t.recipes.placeholders.yield}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.recipes.ingredientsLabel}</p>
            {ingredients.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t.recipes.ingredientsEmpty}
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
            {t.recipes.save}
          </Button>
        </GlassCard>
      ) : null}

      {recipes.length === 0 ? (
        <EmptyState
          title={t.recipes.empty.title}
          description={t.recipes.empty.description}
          actionLabel={t.recipes.empty.action}
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{recipe.name}</h3>
                    <p className="text-sm text-slate-500">
                      {t.recipes.yieldLabel} {recipe.yieldKg} кг
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:text-rose-600"
                    onClick={() => handleDelete(recipe)}
                  >
                    Удалить
                  </Button>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    {t.recipes.ingredientCostLabel}{" "}
                    {formatCurrency(ingredientCost, settings?.currency)}
                  </p>
                  <p>
                    {t.recipes.costPerKgLabel} {formatCurrency(costPerKg, settings?.currency)}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
