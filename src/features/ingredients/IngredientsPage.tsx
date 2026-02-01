import { useState } from "react";
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
import { t } from "../../i18n";
import { ActionSheet } from "../../components/common/ActionSheet";

export function IngredientsPage() {
  const { ingredients, loadAll, deleteIngredient } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [actionIngredientId, setActionIngredientId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);

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
    const confirmed = window.confirm(`Удалить ингредиент ${ingredient.name}?`);
    if (!confirmed) {
      return;
    }
    await deleteIngredient(ingredient.id);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setName(ingredient.name);
    setUnit(ingredient.unit);
    setPrice(ingredient.pricePerUnit);
    setShowForm(true);
    setActionIngredientId(null);
  };

  const handleToggleForm = () => {
    if (showForm) {
      setShowForm(false);
      setEditingIngredient(null);
      setName("");
      setUnit("kg");
      setPrice(0);
      return;
    }
    setEditingIngredient(null);
    setName("");
    setUnit("kg");
    setPrice(0);
    setShowForm(true);
  };

  const activeIngredient = actionIngredientId
    ? ingredients.find((ingredient) => ingredient.id === actionIngredientId)
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                  <p className="text-sm text-slate-500">
                    {ingredient.pricePerUnit} {t.ingredients.per} {ingredient.unit}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
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

      <ActionSheet
        open={Boolean(activeIngredient)}
        onClose={() => setActionIngredientId(null)}
        actions={
          activeIngredient
            ? [
                { label: "Редактировать", onSelect: () => handleEdit(activeIngredient) },
                {
                  label: "Удалить",
                  tone: "destructive",
                  onSelect: async () => {
                    setActionIngredientId(null);
                    await handleDelete(activeIngredient);
                  },
                },
              ]
            : []
        }
      />
    </div>
  );
}
