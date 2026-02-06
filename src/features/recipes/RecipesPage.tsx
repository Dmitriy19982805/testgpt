import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import type { BaseUnit, Recipe, RecipeItem } from "../../db/types";
import { formatCurrency } from "../../utils/currency";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { CenterModal } from "../../components/common/CenterModal";
import { ActionMenu } from "../../components/common/ActionMenu";
import { getIngredientUnitPrice, getRecipeCosts, getUnitLabel, UNIT_OPTIONS } from "./recipeUtils";

interface EditableRecipeItem {
  id: string;
  ingredientId: string;
  ingredientQuery: string;
  quantity: string;
}

interface RecipeFormState {
  name: string;
  category: string;
  yieldAmount: string;
  yieldUnit: BaseUnit;
  notes: string;
  items: EditableRecipeItem[];
  fileName: string;
  fileUrl: string;
}

type RecipeField = "name" | "yieldAmount" | "items";

const initialRecipeForm: RecipeFormState = {
  name: "",
  category: "",
  yieldAmount: "",
  yieldUnit: "g",
  notes: "",
  items: [],
  fileName: "",
  fileUrl: "",
};

function createDraftItem(): EditableRecipeItem {
  return {
    id: crypto.randomUUID(),
    ingredientId: "",
    ingredientQuery: "",
    quantity: "",
  };
}

function toForm(recipe: Recipe): RecipeFormState {
  return {
    name: recipe.name,
    category: recipe.category ?? "",
    yieldAmount: String(recipe.yieldAmount),
    yieldUnit: recipe.yieldUnit,
    notes: recipe.notes ?? "",
    items: recipe.items.map((item) => ({
      id: crypto.randomUUID(),
      ingredientId: item.ingredientId,
      ingredientQuery: "",
      quantity: String(item.amount),
    })),
    fileName: recipe.fileName ?? "",
    fileUrl: recipe.fileUrl ?? "",
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function RecipesPage() {
  const { recipes, ingredients, orders, settings, addRecipe, updateRecipe, deleteRecipe } = useAppStore();
  const [formState, setFormState] = useState<RecipeFormState>(initialRecipeForm);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Recipe | null>(null);
  const [blockedDeleteRecipe, setBlockedDeleteRecipe] = useState<Recipe | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<RecipeField, boolean>>>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedItems = useMemo(() => {
    return formState.items.map((item) => {
      const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
      const quantity = Number(item.quantity);
      const isQuantityValid = Number.isFinite(quantity) && quantity > 0;
      const rowCost = ingredient && isQuantityValid ? roundMoney(getIngredientUnitPrice(ingredient) * quantity) : 0;
      return {
        ...item,
        ingredient,
        quantityNumber: quantity,
        isQuantityValid,
        rowCost,
      };
    });
  }, [formState.items, ingredients]);

  const validation = useMemo(() => {
    const errors: Partial<Record<RecipeField, string>> = {};
    const trimmedName = formState.name.trim();
    const yieldAmount = Number(formState.yieldAmount);

    const validRows = parsedItems.filter((item) => item.ingredient && item.isQuantityValid);
    const hasInvalidRows = parsedItems.some((item) => !item.ingredient || !item.isQuantityValid);

    if (!trimmedName) {
      errors.name = "Введите название рецепта.";
    }

    if (!Number.isFinite(yieldAmount) || yieldAmount <= 0) {
      errors.yieldAmount = "Укажите корректный выход больше 0.";
    }

    if (parsedItems.length === 0 || hasInvalidRows) {
      errors.items = "Добавьте минимум один корректный ингредиент.";
    }

    const mergedItems = new Map<string, RecipeItem>();
    validRows.forEach((item) => {
      if (!item.ingredient) {
        return;
      }
      const existing = mergedItems.get(item.ingredient.id);
      if (existing) {
        const nextAmount = roundMoney(existing.amount + item.quantityNumber);
        mergedItems.set(item.ingredient.id, {
          ...existing,
          amount: nextAmount,
          rowCost: roundMoney(getIngredientUnitPrice(item.ingredient) * nextAmount),
        });
        return;
      }
      mergedItems.set(item.ingredient.id, {
        ingredientId: item.ingredient.id,
        amount: item.quantityNumber,
        unit: item.ingredient.baseUnit,
        rowCost: item.rowCost,
      });
    });

    const parsed = {
      name: trimmedName,
      category: formState.category.trim(),
      yieldAmount,
      yieldUnit: formState.yieldUnit,
      notes: formState.notes.trim(),
      items: Array.from(mergedItems.values()),
      fileName: formState.fileName,
      fileUrl: formState.fileUrl,
    };

    return {
      errors,
      parsed,
      isValid: Object.keys(errors).length === 0,
    };
  }, [formState, parsedItems]);

  const recipeTotals = useMemo(() => {
    const draftRecipe: Recipe = {
      id: "draft",
      name: formState.name,
      category: formState.category,
      yieldAmount: Number(formState.yieldAmount || 0),
      yieldUnit: formState.yieldUnit,
      notes: formState.notes,
      items: validation.parsed.items,
      fileName: formState.fileName,
      fileUrl: formState.fileUrl,
      createdAt: "",
      updatedAt: "",
    };
    return getRecipeCosts(draftRecipe, ingredients);
  }, [formState, ingredients, validation.parsed.items]);

  const setField = <K extends keyof RecipeFormState>(field: K, value: RecipeFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: RecipeField) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const shouldShowError = (field: RecipeField) => Boolean(validation.errors[field]) && (touchedFields[field] || formSubmitted);

  const resetForm = () => {
    setFormState(initialRecipeForm);
    setEditingRecipe(null);
    setTouchedFields({});
    setFormSubmitted(false);
  };

  const openCreate = () => {
    resetForm();
    setFormState((prev) => ({ ...prev, items: [createDraftItem()] }));
    setShowFormModal(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormState(toForm(recipe));
    setTouchedFields({});
    setFormSubmitted(false);
    setShowFormModal(true);
  };

  const addItemRow = () => {
    setFormState((prev) => ({ ...prev, items: [...prev.items, createDraftItem()] }));
  };

  const updateItemRow = (id: string, patch: Partial<EditableRecipeItem>) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeItemRow = (id: string) => {
    setFormState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
    markTouched("items");
  };

  const saveRecipe = async () => {
    setFormSubmitted(true);
    if (!validation.isValid) {
      return;
    }
    if (editingRecipe) {
      await updateRecipe({ ...editingRecipe, ...validation.parsed });
    } else {
      await addRecipe(validation.parsed);
    }
    setShowFormModal(false);
    resetForm();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("file_read_failed"));
      reader.readAsDataURL(file);
    });

    setFormState((prev) => ({
      ...prev,
      fileName: file.name,
      fileUrl: dataUrl,
    }));
  };

  const isDeleteBlocked = (recipeId: string) => orders.some((order) => order.recipeId === recipeId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Рецепты"
        description="Сборник рецептов с автоматическим расчётом себестоимости."
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2" size={16} />
            Добавить рецепт
          </Button>
        }
      />

      {recipes.length === 0 ? (
        <EmptyState title="Рецептов пока нет" description="Добавьте первый рецепт, чтобы рассчитывать себестоимость автоматически." actionLabel="Добавить рецепт" onAction={openCreate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => {
            const totals = getRecipeCosts(recipe, ingredients);
            return (
              <GlassCard key={recipe.id} className="space-y-3 rounded-2xl border border-white/50 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">{recipe.name}</h3>
                    <p className="text-sm text-slate-500">{recipe.category?.trim() || "Без категории"}</p>
                    <p className="text-sm text-slate-600">Выход: {recipe.yieldAmount} {getUnitLabel(recipe.yieldUnit)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    onClick={(event) => {
                      setActiveMenuId(recipe.id);
                      setMenuAnchor(event.currentTarget);
                    }}
                  >
                    <MoreVertical size={16} />
                  </Button>
                  <ActionMenu
                    open={activeMenuId === recipe.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setActiveMenuId(null);
                        setMenuAnchor(null);
                      }
                    }}
                    anchorEl={activeMenuId === recipe.id ? menuAnchor : null}
                    onEdit={() => openEdit(recipe)}
                    onDelete={() => {
                      if (isDeleteBlocked(recipe.id)) {
                        setBlockedDeleteRecipe(recipe);
                        return;
                      }
                      setConfirmDelete(recipe);
                    }}
                  />
                </div>

                <div className="space-y-1 text-sm text-slate-600">
                  <p>Себестоимость: {formatCurrency(roundMoney(totals.recipeTotalCost), settings?.currency ?? "RUB")}</p>
                  <p>
                    Себестоимость за единицу: {formatCurrency(roundMoney(totals.costPerYieldUnit), settings?.currency ?? "RUB")} / {getUnitLabel(recipe.yieldUnit)}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <CenterModal
        open={showFormModal}
        onOpenChange={(open) => {
          setShowFormModal(open);
          if (!open) {
            resetForm();
          }
        }}
        title={editingRecipe ? "Редактировать рецепт" : "Добавить рецепт"}
        className="w-[94vw] max-w-[720px] rounded-3xl border border-slate-200/70 bg-white px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        bodyClassName="mt-5 max-h-[72vh] space-y-6 overflow-y-auto pr-1"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setShowFormModal(false)}>
              Отмена
            </Button>
            <Button className="flex-1" onClick={() => void saveRecipe()}>
              Сохранить
            </Button>
          </>
        }
      >
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Основное</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Название рецепта</label>
              <Input value={formState.name} onChange={(event) => setField("name", event.target.value)} onBlur={() => markTouched("name")} placeholder="Например: Крем-чиз" className={shouldShowError("name") ? "border-rose-400" : undefined} />
              {shouldShowError("name") ? <p className="text-xs text-rose-500">{validation.errors.name}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Категория (опционально)</label>
              <Input value={formState.category} onChange={(event) => setField("category", event.target.value)} placeholder="Например: Кремы" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Выход</label>
              <Input type="number" min="0.01" step="0.01" value={formState.yieldAmount} onChange={(event) => setField("yieldAmount", event.target.value)} onBlur={() => markTouched("yieldAmount")} placeholder="Например: 1000" className={shouldShowError("yieldAmount") ? "border-rose-400" : undefined} />
              {shouldShowError("yieldAmount") ? <p className="text-xs text-rose-500">{validation.errors.yieldAmount}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Ед. выхода</label>
              <select
                value={formState.yieldUnit}
                onChange={(event) => setField("yieldUnit", event.target.value as BaseUnit)}
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Описание (опционально)</label>
              <textarea
                value={formState.notes}
                onChange={(event) => setField("notes", event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="Комментарии по технологии или хранению"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Состав</h3>
            <Button type="button" variant="outline" onClick={addItemRow}>
              <Plus className="mr-2" size={14} />
              Добавить ингредиент
            </Button>
          </div>

          <div className="space-y-3">
            {parsedItems.map((item) => {
              const selectedIngredient = item.ingredient;
              const unavailableIngredientIds = new Set(
                parsedItems.filter((row) => row.id !== item.id).map((row) => row.ingredientId).filter(Boolean)
              );

              return (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 md:grid-cols-[1.2fr_0.8fr_110px_auto] md:items-center">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Ингредиент</label>
                    <Input
                      list={`recipe-ingredients-${item.id}`}
                      value={item.ingredientQuery || selectedIngredient?.name || ""}
                      onChange={(event) => {
                        const nextQuery = event.target.value;
                        const matchedIngredient = ingredients.find((ingredient) => ingredient.name === nextQuery);
                        if (!matchedIngredient) {
                          updateItemRow(item.id, { ingredientId: "", ingredientQuery: nextQuery });
                          markTouched("items");
                          return;
                        }
                        if (unavailableIngredientIds.has(matchedIngredient.id)) {
                          return;
                        }
                        updateItemRow(item.id, { ingredientId: matchedIngredient.id, ingredientQuery: "" });
                        markTouched("items");
                      }}
                      onBlur={() => markTouched("items")}
                      placeholder="Найти и выбрать ингредиент"
                    />
                    <datalist id={`recipe-ingredients-${item.id}`}>
                      {ingredients
                        .filter((ingredient) => !unavailableIngredientIds.has(ingredient.id) || ingredient.id === item.ingredientId)
                        .map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.name} />
                        ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Количество</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => {
                        updateItemRow(item.id, { quantity: event.target.value });
                        markTouched("items");
                      }}
                      onBlur={() => markTouched("items")}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Ед.</label>
                    <div className="flex h-10 items-center rounded-xl border border-slate-200/70 bg-slate-50 px-3 text-sm text-slate-600">
                      {selectedIngredient ? getUnitLabel(selectedIngredient.baseUnit) : "—"}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2 md:block">
                    <p className="text-sm text-slate-600 md:mb-2">{formatCurrency(item.rowCost, settings?.currency ?? "RUB")}</p>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => removeItemRow(item.id)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {shouldShowError("items") ? <p className="text-xs text-rose-500">{validation.errors.items}</p> : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Файл (опционально)</h3>
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={(event) => void handleFileUpload(event)} className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2" size={14} />
            Загрузить PDF
          </Button>

          {formState.fileName ? (
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">{formState.fileName}</p>
              <div className="mt-2 flex items-center gap-3">
                <a href={formState.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 transition hover:text-indigo-500">
                  Открыть
                </a>
                <button type="button" className="text-rose-500 transition hover:text-rose-400" onClick={() => setFormState((prev) => ({ ...prev, fileName: "", fileUrl: "" }))}>
                  Удалить файл
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="rounded-2xl bg-slate-100/80 p-4 text-sm">
          <p>Итого себестоимость: {formatCurrency(roundMoney(recipeTotals.recipeTotalCost), settings?.currency ?? "RUB")}</p>
          <p>
            Себестоимость за единицу: {formatCurrency(roundMoney(recipeTotals.costPerYieldUnit), settings?.currency ?? "RUB")} / {getUnitLabel(formState.yieldUnit)}
          </p>
        </div>
      </CenterModal>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(null);
          }
        }}
        title="Удалить рецепт?"
        description={confirmDelete ? `Рецепт «${confirmDelete.name}» будет удалён без возможности восстановления.` : ""}
        onConfirm={async () => {
          if (!confirmDelete) {
            return;
          }
          await deleteRecipe(confirmDelete.id);
          setConfirmDelete(null);
          setActiveMenuId(null);
          setMenuAnchor(null);
        }}
      />

      <CenterModal
        open={Boolean(blockedDeleteRecipe)}
        onOpenChange={(open) => {
          if (!open) {
            setBlockedDeleteRecipe(null);
          }
        }}
        title="Удаление недоступно"
        description="Рецепт используется в заказах и не может быть удалён."
        className="w-[92vw] max-w-[460px] rounded-3xl border border-slate-200/70 bg-white px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        footer={
          <Button className="w-full" onClick={() => setBlockedDeleteRecipe(null)}>
            Понятно
          </Button>
        }
      />
    </div>
  );
}
