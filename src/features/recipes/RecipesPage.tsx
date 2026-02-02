import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { OriginModal } from "../../components/common/OriginModal";
import { CenterModal } from "../../components/common/CenterModal";

export function RecipesPage() {
  const { recipes, ingredients, loadAll, settings, deleteRecipe } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState("");
  const [yieldKg, setYieldKg] = useState(1);
  const [ingredientQty, setIngredientQty] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRecipe, setConfirmRecipe] = useState<Recipe | null>(null);
  const [detailsRecipe, setDetailsRecipe] = useState<Recipe | null>(null);
  const [formOriginRect, setFormOriginRect] = useState<DOMRect | null>(null);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);

  const handleSave = async () => {
    if (editingRecipe) {
      const updated: Recipe = {
        ...editingRecipe,
        name,
        yieldKg,
        ingredients: Object.entries(ingredientQty)
          .filter(([, qty]) => qty > 0)
          .map(([ingredientId, qty]) => ({ ingredientId, qty })),
      };
      await db.recipes.put(updated);
      await loadAll();
      setName("");
      setYieldKg(1);
      setIngredientQty({});
      setShowForm(false);
      setEditingRecipe(null);
      return;
    }

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
    setConfirmRecipe(recipe);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmRecipe) {
      return;
    }
    await deleteRecipe(confirmRecipe.id);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setName(recipe.name);
    setYieldKg(recipe.yieldKg);
    setIngredientQty(
      recipe.ingredients.reduce(
        (acc, ingredient) => ({
          ...acc,
          [ingredient.ingredientId]: ingredient.qty,
        }),
        {} as Record<string, number>
      )
    );
    setShowForm(true);
  };

  const openNewRecipe = () => {
    setEditingRecipe(null);
    setName("");
    setYieldKg(1);
    setIngredientQty({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
    setName("");
    setYieldKg(1);
    setIngredientQty({});
  };

  const handleToggleForm = () => {
    if (showForm) {
      closeForm();
      return;
    }
    openNewRecipe();
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
          <Button
            onClick={(event) => {
              setFormOriginRect(event.currentTarget.getBoundingClientRect());
              handleToggleForm();
            }}
          >
            {showForm ? t.recipes.actions.close : t.recipes.actions.new}
          </Button>
        }
      />

      <OriginModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        originRect={formOriginRect}
        title={editingRecipe ? "Редактирование рецепта" : "Новый рецепт"}
      >
        <div className="space-y-4">
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
              <p className="text-sm text-slate-500">{t.recipes.ingredientsEmpty}</p>
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
        </div>
      </OriginModal>

      {recipes.length === 0 ? (
        <EmptyState
          title={t.recipes.empty.title}
          description={t.recipes.empty.description}
          actionLabel={t.recipes.empty.action}
          onAction={openNewRecipe}
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
              <GlassCard
                key={recipe.id}
                className="cursor-pointer p-5 transition hover:border-slate-300/70"
                onClick={() => setDetailsRecipe(recipe)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{recipe.name}</h3>
                    <p className="text-sm text-slate-500">
                      {t.recipes.yieldLabel} {recipe.yieldKg} кг
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-full p-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFormOriginRect(event.currentTarget.getBoundingClientRect());
                        handleEdit(recipe);
                      }}
                      aria-label="Редактировать рецепт"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-full p-0 text-rose-500 hover:text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteOriginRect(event.currentTarget.getBoundingClientRect());
                        void handleDelete(recipe);
                      }}
                      aria-label="Удалить рецепт"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
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

      <CenterModal
        open={Boolean(detailsRecipe)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsRecipe(null);
          }
        }}
        title={detailsRecipe?.name ?? "Рецепт"}
        description="Детали рецепта"
        footer={
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-2xl"
            onClick={() => setDetailsRecipe(null)}
          >
            Закрыть
          </Button>
        }
      >
        {detailsRecipe ? (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-200">
            <div>
              <p className="text-xs uppercase text-slate-400">Выход</p>
              <p>{detailsRecipe.yieldKg} кг</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase text-slate-400">Ингредиенты</p>
              {detailsRecipe.ingredients.length === 0 ? (
                <p>—</p>
              ) : (
                <ul className="space-y-2">
                  {detailsRecipe.ingredients.map((entry) => {
                    const ingredient = ingredients.find(
                      (item) => item.id === entry.ingredientId
                    );
                    return (
                      <li
                        key={entry.ingredientId}
                        className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-2 dark:border-slate-800/60 dark:bg-slate-900/60"
                      >
                        <span>{ingredient?.name ?? "—"}</span>
                        <span className="text-xs text-slate-500">
                          {entry.qty} {ingredient?.unit ?? ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </CenterModal>

      <OriginModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmRecipe(null);
          }
        }}
        originRect={deleteOriginRect}
        title="Удалить рецепт?"
        description="Это действие нельзя отменить."
        variant="danger"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleConfirmDelete}
            >
              Удалить
            </Button>
          </>
        }
      />
    </div>
  );
}
