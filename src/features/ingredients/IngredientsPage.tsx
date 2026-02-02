import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
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
import { ActionMenu } from "../../components/common/ActionMenu";
import { DrawerSheet } from "../../components/common/DrawerSheet";
import { ConfirmModal } from "../../components/common/ConfirmModal";

export function IngredientsPage() {
  const { ingredients, recipes, loadAll, deleteIngredient, settings } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [actionIngredientId, setActionIngredientId] = useState<string | null>(null);
  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIngredient, setConfirmIngredient] = useState<Ingredient | null>(null);

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
      window.alert("Нельзя удалить ингредиент: он используется в рецептах.");
      return;
    }
    setConfirmIngredient(ingredient);
    setConfirmOpen(true);
    setActionIngredientId(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmIngredient) {
      return;
    }
    await deleteIngredient(confirmIngredient.id);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setName(ingredient.name);
    setUnit(ingredient.unit);
    setPrice(ingredient.pricePerUnit);
    setShowForm(true);
    setActionIngredientId(null);
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

  const activeIngredient = actionIngredientId
    ? ingredients.find((ingredient) => ingredient.id === actionIngredientId)
    : null;
  const activeAnchor = actionIngredientId
    ? actionButtonRefs.current[actionIngredientId]
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.ingredients.title}
        description={t.ingredients.description}
        action={
          <Button onClick={handleToggleForm}>
            {showForm ? t.ingredients.actions.close : t.ingredients.actions.add}
          </Button>
        }
      />

      <DrawerSheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
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
      </DrawerSheet>

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
            <GlassCard key={ingredient.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(ingredient.pricePerUnit, settings?.currency)}{" "}
                    {t.ingredients.per} {ingredient.unit}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                  ref={(node) => {
                    actionButtonRefs.current[ingredient.id] = node;
                  }}
                  onClick={() => setActionIngredientId(ingredient.id)}
                  aria-label="Действия с ингредиентом"
                >
                  <Pencil size={16} />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <ActionMenu
        open={Boolean(activeIngredient)}
        anchorEl={activeAnchor}
        onOpenChange={(open) => {
          if (!open) {
            setActionIngredientId(null);
          }
        }}
        onEdit={() => {
          if (activeIngredient) {
            handleEdit(activeIngredient);
          }
        }}
        onDelete={() => {
          if (activeIngredient) {
            void handleDelete(activeIngredient);
          }
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmIngredient(null);
          }
        }}
        title="Удалить ингредиент?"
        description="Это действие нельзя отменить."
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
