import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { db } from "../../db";
import { createId } from "../../utils/ids";
import type { Ingredient } from "../../db/types";
import { formatCurrency } from "../../utils/currency";
import { t } from "../../i18n";
import { OriginModal } from "../../components/common/OriginModal";
import { CenterModal } from "../../components/common/CenterModal";

export function IngredientsPage() {
  const { ingredients, recipes, loadAll, deleteIngredient, settings } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIngredient, setConfirmIngredient] = useState<Ingredient | null>(null);
  const [detailsIngredient, setDetailsIngredient] = useState<Ingredient | null>(null);
  const [formOriginRect, setFormOriginRect] = useState<DOMRect | null>(null);
  const [deleteOriginRect, setDeleteOriginRect] = useState<DOMRect | null>(null);
  const [blockedDeleteOpen, setBlockedDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (editingIngredient) {
      const updated: Ingredient = {
        ...editingIngredient,
        name,
        unit,
        pricePerUnit: price,
      };
      await db.ingredients.put(updated);
      await loadAll();
      setName("");
      setUnit("kg");
      setPrice(0);
      setShowForm(false);
      setEditingIngredient(null);
      return;
    }

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

  const handleDelete = async (ingredient: Ingredient) => {
    const usedInRecipes = recipes.some((recipe) =>
      recipe.ingredients.some((entry) => entry.ingredientId === ingredient.id)
    );
    if (usedInRecipes) {
      setBlockedDeleteOpen(true);
      return;
    }
    setConfirmIngredient(ingredient);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmIngredient) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteIngredient(confirmIngredient.id);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setConfirmIngredient(null);
      setDeleteOriginRect(null);
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setName(ingredient.name);
    setUnit(ingredient.unit);
    setPrice(ingredient.pricePerUnit);
    setShowForm(true);
  };

  const openNewIngredient = () => {
    setEditingIngredient(null);
    setName("");
    setUnit("kg");
    setPrice(0);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingIngredient(null);
    setName("");
    setUnit("kg");
    setPrice(0);
  };

  const handleToggleForm = () => {
    if (showForm) {
      closeForm();
      return;
    }
    openNewIngredient();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.ingredients.title}
        description={t.ingredients.description}
        action={
          <Button
            onClick={(event) => {
              setFormOriginRect(event.currentTarget.getBoundingClientRect());
              handleToggleForm();
            }}
          >
            {showForm ? t.ingredients.actions.close : t.ingredients.actions.add}
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
        title={editingIngredient ? "Редактирование ингредиента" : "Новый ингредиент"}
      >
        <div className="space-y-3">
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
        </div>
      </OriginModal>

      {ingredients.length === 0 ? (
        <EmptyState
          title={t.ingredients.empty.title}
          description={t.ingredients.empty.description}
          actionLabel={t.ingredients.empty.action}
          onAction={openNewIngredient}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ingredients.map((ingredient) => (
            <GlassCard
              key={ingredient.id}
              className="cursor-pointer p-5 transition hover:border-slate-300/70"
              onClick={() => setDetailsIngredient(ingredient)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(ingredient.pricePerUnit, settings?.currency)}{" "}
                    {t.ingredients.per} {ingredient.unit}
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
                      handleEdit(ingredient);
                    }}
                    aria-label="Редактировать ингредиент"
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
                      void handleDelete(ingredient);
                    }}
                    aria-label="Удалить ингредиент"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <CenterModal
        open={Boolean(detailsIngredient)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsIngredient(null);
          }
        }}
        title={detailsIngredient?.name ?? "Ингредиент"}
        description="Детали ингредиента"
        footer={
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-2xl"
            onClick={() => setDetailsIngredient(null)}
          >
            Закрыть
          </Button>
        }
      >
        {detailsIngredient ? (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-200">
            <div>
              <p className="text-xs uppercase text-slate-400">Стоимость</p>
              <p>
                {formatCurrency(detailsIngredient.pricePerUnit, settings?.currency)}{" "}
                {t.ingredients.per} {detailsIngredient.unit}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Используется в рецептах</p>
              <p>
                {
                  recipes.filter((recipe) =>
                    recipe.ingredients.some((entry) => entry.ingredientId === detailsIngredient.id)
                  ).length
                }
              </p>
            </div>
          </div>
        ) : null}
      </CenterModal>

      <OriginModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmIngredient(null);
          }
        }}
        originRect={deleteOriginRect}
        title="Удалить ингредиент?"
        description="Это действие нельзя отменить."
        variant="danger"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-rose-500 text-white hover:bg-rose-600"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </Button>
          </>
        }
      />

      <CenterModal
        open={blockedDeleteOpen}
        onOpenChange={setBlockedDeleteOpen}
        title="Удаление недоступно"
        description="Нельзя удалить ингредиент: он используется в рецептах."
        footer={
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-2xl"
            onClick={() => setBlockedDeleteOpen(false)}
          >
            Понятно
          </Button>
        }
      />
    </div>
  );
}
