import { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import type { BaseUnit, Ingredient } from "../../db/types";
import { formatCurrency } from "../../utils/currency";
import { CenterModal } from "../../components/common/CenterModal";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { ActionMenu } from "../../components/common/ActionMenu";
import { UNIT_OPTIONS, getIngredientUnitPrice, getUnitLabel } from "../recipes/recipeUtils";

interface IngredientFormState {
  name: string;
  category: string;
  baseUnit: BaseUnit;
  packSize: string;
  packPrice: string;
  lossPct: string;
}

const initialFormState: IngredientFormState = {
  name: "",
  category: "",
  baseUnit: "g",
  packSize: "",
  packPrice: "",
  lossPct: "0",
};

function validateIngredientForm(values: IngredientFormState) {
  const errors: Partial<Record<keyof IngredientFormState, string>> = {};
  if (!values.name.trim()) {
    errors.name = "Введите название ингредиента.";
  }
  const packSize = Number(values.packSize);
  if (!values.packSize || !Number.isFinite(packSize) || packSize <= 0) {
    errors.packSize = "Укажите фасовку больше 0.";
  }
  const packPrice = Number(values.packPrice);
  if (!values.packPrice || !Number.isFinite(packPrice) || packPrice < 0) {
    errors.packPrice = "Укажите цену упаковки (0 или больше).";
  }
  const lossPct = Number(values.lossPct || 0);
  if (!Number.isFinite(lossPct) || lossPct < 0 || lossPct > 100) {
    errors.lossPct = "Потери должны быть от 0 до 100%.";
  }

  return {
    errors,
    parsed: {
      name: values.name.trim(),
      category: values.category.trim(),
      baseUnit: values.baseUnit,
      packSize: Number(values.packSize),
      packPrice: Number(values.packPrice),
      lossPct: Number(values.lossPct || 0),
    },
    isValid: Object.keys(errors).length === 0,
  };
}

function toFormState(ingredient: Ingredient): IngredientFormState {
  return {
    name: ingredient.name,
    category: ingredient.category ?? "",
    baseUnit: ingredient.baseUnit,
    packSize: String(ingredient.packSize),
    packPrice: String(ingredient.packPrice),
    lossPct: String(ingredient.lossPct ?? 0),
  };
}

export function IngredientsPage() {
  const { ingredients, recipes, settings, addIngredient, updateIngredient, deleteIngredient } = useAppStore();
  const [formState, setFormState] = useState<IngredientFormState>(initialFormState);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ingredient | null>(null);
  const [blockedDeleteIngredient, setBlockedDeleteIngredient] = useState<Ingredient | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inlineErrorsShown, setInlineErrorsShown] = useState(false);

  const validation = useMemo(() => validateIngredientForm(formState), [formState]);

  const setField = <K extends keyof IngredientFormState>(field: K, value: IngredientFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setEditingIngredient(null);
    setInlineErrorsShown(false);
  };

  const saveIngredient = async () => {
    setInlineErrorsShown(true);
    if (!validation.isValid) {
      return;
    }
    if (editingIngredient) {
      await updateIngredient({
        ...editingIngredient,
        ...validation.parsed,
      });
      setEditModalOpen(false);
      resetForm();
      return;
    }

    await addIngredient(validation.parsed);
    resetForm();
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormState(toFormState(ingredient));
    setInlineErrorsShown(false);
    setEditModalOpen(true);
  };

  const isUsedByRecipes = (ingredientId: string) =>
    recipes.some((recipe) => recipe.items.some((item) => item.ingredientId === ingredientId));

  return (
    <div className="space-y-6">
      <PageHeader title="Ингредиенты" description="Справочник сырья с точной ценой за единицу." />

      <GlassCard className="space-y-4 p-5">
        <h3 className="text-lg font-semibold">Новый ингредиент</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Input placeholder="Название" value={formState.name} onChange={(event) => setField("name", event.target.value)} />
            {inlineErrorsShown && validation.errors.name ? <p className="text-xs text-rose-500">{validation.errors.name}</p> : null}
          </div>
          <Input placeholder="Категория (опционально)" value={formState.category} onChange={(event) => setField("category", event.target.value)} />
          <div>
            <select
              value={formState.baseUnit}
              onChange={(event) => setField("baseUnit", event.target.value as BaseUnit)}
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
            >
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Input type="number" min="0.0001" step="0.01" placeholder="Фасовка (в базовой ед.)" value={formState.packSize} onChange={(event) => setField("packSize", event.target.value)} />
            {inlineErrorsShown && validation.errors.packSize ? <p className="text-xs text-rose-500">{validation.errors.packSize}</p> : null}
          </div>
          <div className="space-y-1">
            <Input type="number" min="0" step="0.01" placeholder="Цена упаковки" value={formState.packPrice} onChange={(event) => setField("packPrice", event.target.value)} />
            {inlineErrorsShown && validation.errors.packPrice ? <p className="text-xs text-rose-500">{validation.errors.packPrice}</p> : null}
          </div>
          <div className="space-y-1">
            <Input type="number" min="0" max="100" step="0.1" placeholder="Потери, %" value={formState.lossPct} onChange={(event) => setField("lossPct", event.target.value)} />
            {inlineErrorsShown && validation.errors.lossPct ? <p className="text-xs text-rose-500">{validation.errors.lossPct}</p> : null}
          </div>
        </div>
        <Button onClick={() => void saveIngredient()} disabled={!validation.isValid}>Сохранить ингредиент</Button>
      </GlassCard>

      {ingredients.length === 0 ? (
        <EmptyState title="Ингредиентов пока нет" description="Добавьте первый ингредиент для расчётов себестоимости." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ingredients.map((ingredient) => {
            const unitPrice = getIngredientUnitPrice(ingredient);
            return (
              <GlassCard key={ingredient.id} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                    <p className="text-sm text-slate-500">{ingredient.category?.trim() || "Без категории"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    onClick={(event) => {
                      setActiveMenuId(ingredient.id);
                      setMenuAnchor(event.currentTarget);
                    }}
                  >
                    <MoreVertical size={16} />
                  </Button>
                  <ActionMenu
                    open={activeMenuId === ingredient.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setActiveMenuId(null);
                      }
                    }}
                    anchorEl={activeMenuId === ingredient.id ? menuAnchor : null}
                    onEdit={() => openEdit(ingredient)}
                    onDelete={() => {
                      if (isUsedByRecipes(ingredient.id)) {
                        setBlockedDeleteIngredient(ingredient);
                        return;
                      }
                      setConfirmDelete(ingredient);
                    }}
                  />
                </div>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p>
                    Цена за единицу: {formatCurrency(unitPrice, settings?.currency ?? "RUB")} / {getUnitLabel(ingredient.baseUnit)}
                  </p>
                  <p>
                    Упаковка: {formatCurrency(ingredient.packPrice, settings?.currency ?? "RUB")} за {ingredient.packSize} {getUnitLabel(ingredient.baseUnit)}
                  </p>
                  {ingredient.lossPct ? <p>Потери: {ingredient.lossPct}%</p> : null}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <CenterModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title="Редактирование ингредиента"
        description="Обновите параметры упаковки и цены"
        className="glass-card max-w-[560px] rounded-2xl border border-white/40 px-6 py-6"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setEditModalOpen(false)}>Отмена</Button>
            <Button className="flex-1" disabled={!validation.isValid} onClick={() => void saveIngredient()}>Сохранить</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Input placeholder="Название" value={formState.name} onChange={(event) => setField("name", event.target.value)} />
            {inlineErrorsShown && validation.errors.name ? <p className="text-xs text-rose-500">{validation.errors.name}</p> : null}
          </div>
          <Input placeholder="Категория" value={formState.category} onChange={(event) => setField("category", event.target.value)} />
          <select
            value={formState.baseUnit}
            onChange={(event) => setField("baseUnit", event.target.value as BaseUnit)}
            className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm"
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
          <div className="space-y-1">
            <Input type="number" min="0.0001" step="0.01" placeholder="Фасовка" value={formState.packSize} onChange={(event) => setField("packSize", event.target.value)} />
            {inlineErrorsShown && validation.errors.packSize ? <p className="text-xs text-rose-500">{validation.errors.packSize}</p> : null}
          </div>
          <div className="space-y-1">
            <Input type="number" min="0" step="0.01" placeholder="Цена упаковки" value={formState.packPrice} onChange={(event) => setField("packPrice", event.target.value)} />
            {inlineErrorsShown && validation.errors.packPrice ? <p className="text-xs text-rose-500">{validation.errors.packPrice}</p> : null}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Input type="number" min="0" max="100" step="0.1" placeholder="Потери, %" value={formState.lossPct} onChange={(event) => setField("lossPct", event.target.value)} />
            {inlineErrorsShown && validation.errors.lossPct ? <p className="text-xs text-rose-500">{validation.errors.lossPct}</p> : null}
          </div>
        </div>
      </CenterModal>


      <CenterModal
        open={Boolean(blockedDeleteIngredient)}
        onOpenChange={(open) => {
          if (!open) {
            setBlockedDeleteIngredient(null);
          }
        }}
        title="Удаление недоступно"
        description={blockedDeleteIngredient ? `Ингредиент «${blockedDeleteIngredient.name}» используется в рецептах.` : ""}
        footer={<Button variant="outline" className="flex-1" onClick={() => setBlockedDeleteIngredient(null)}>Понятно</Button>}
      />

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(null);
          }
        }}
        title="Удалить ингредиент?"
        description={confirmDelete ? `Ингредиент «${confirmDelete.name}» будет удалён без возможности восстановления.` : ""}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={async () => {
          if (!confirmDelete) {
            return;
          }
          await deleteIngredient(confirmDelete.id);
          setConfirmDelete(null);
          setActiveMenuId(null);
        }}
      />
    </div>
  );
}
