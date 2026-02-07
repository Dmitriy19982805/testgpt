import { useMemo, useState } from "react";
import { Check, MoreVertical, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { toBaseUnit, type BaseUnit, type Ingredient } from "../../db/types";
import { formatCurrency, formatUnitCurrency } from "../../utils/currency";
import { CenterModal } from "../../components/common/CenterModal";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { ActionMenu } from "../../components/common/ActionMenu";
import { UNIT_OPTIONS, getIngredientUnitPrice, getUnitLabel } from "../recipes/recipeUtils";

interface IngredientFormState {
  name: string;
  category: string;
  baseUnit: BaseUnit | "";
  packSize: string;
  packPrice: string;
}

const initialFormState: IngredientFormState = {
  name: "",
  category: "",
  baseUnit: "",
  packSize: "",
  packPrice: "",
};

function validateIngredientForm(values: IngredientFormState) {
  const errors: Partial<Record<keyof IngredientFormState, string>> = {};
  if (!values.name.trim()) {
    errors.name = "Введите название ингредиента.";
  }
  if (!values.baseUnit) {
    errors.baseUnit = "Выберите единицу измерения.";
  }
  const packSize = Number(values.packSize);
  if (!values.packSize || !Number.isFinite(packSize) || packSize <= 0) {
    errors.packSize = "Укажите количество в упаковке больше 0.";
  }
  const packPrice = Number(values.packPrice);
  if (!values.packPrice || !Number.isFinite(packPrice) || packPrice <= 0) {
    errors.packPrice = "Укажите цену упаковки больше 0.";
  }
  return {
    errors,
    parsed: {
      name: values.name.trim(),
      category: values.category.trim(),
      baseUnit: toBaseUnit(values.baseUnit) ?? "g",
      packSize: Number.isFinite(packSize) ? packSize : 0,
      packPrice: Number.isFinite(packPrice) ? packPrice : 0,
    },
    isValid: Object.keys(errors).length === 0,
  };
}

function toFormState(ingredient: Ingredient): IngredientFormState {
  return {
    name: ingredient.name,
    category: ingredient.category ?? "",
    baseUnit: ingredient.baseUnit,
    packSize: ingredient.packSize > 0 ? String(ingredient.packSize) : "",
    packPrice: ingredient.packPrice > 0 ? String(ingredient.packPrice) : "",
  };
}

export function IngredientsPage() {
  const { ingredients, recipes, settings, addIngredient, updateIngredient, deleteIngredient } = useAppStore();
  const [formState, setFormState] = useState<IngredientFormState>(initialFormState);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof IngredientFormState, boolean>>>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ingredient | null>(null);
  const [blockedDeleteIngredient, setBlockedDeleteIngredient] = useState<Ingredient | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const validation = useMemo(() => validateIngredientForm(formState), [formState]);
  const computedUnitPrice = useMemo(() => {
    const packSize = Number(formState.packSize);
    const packPrice = Number(formState.packPrice);

    if (!Number.isFinite(packSize) || !Number.isFinite(packPrice) || packSize <= 0 || packPrice <= 0) {
      return "—";
    }

    const unitPrice = packPrice / packSize;
    if (!Number.isFinite(unitPrice)) {
      return "—";
    }

    return formatUnitCurrency(unitPrice, settings?.currency ?? "RUB");
  }, [formState.packPrice, formState.packSize, settings?.currency]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    let hasUncategorized = false;

    ingredients.forEach((ingredient) => {
      const normalizedCategory = ingredient.category?.trim() ?? "";
      if (normalizedCategory) {
        categories.add(normalizedCategory);
      } else {
        hasUncategorized = true;
      }
    });

    const sortedCategories = Array.from(categories).sort((a, b) => a.localeCompare(b, "ru"));
    return hasUncategorized ? ["Без категории", ...sortedCategories] : sortedCategories;
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return ingredients.filter((ingredient) => {
      const normalizedCategory = ingredient.category?.trim() || "";
      const displayCategory = normalizedCategory || "Без категории";
      const matchesQuery =
        normalizedQuery.length === 0 ||
        ingredient.name.trim().toLocaleLowerCase().includes(normalizedQuery) ||
        displayCategory.toLocaleLowerCase().includes(normalizedQuery);

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "Без категории" ? normalizedCategory.length === 0 : normalizedCategory === selectedCategory);

      return matchesQuery && matchesCategory;
    });
  }, [ingredients, searchQuery, selectedCategory]);

  const setField = <K extends keyof IngredientFormState>(field: K, value: IngredientFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const markFieldTouched = (field: keyof IngredientFormState) => {
    setTouchedFields((prev) => {
      if (prev[field]) {
        return prev;
      }

      return { ...prev, [field]: true };
    });
  };

  const shouldShowError = (field: keyof IngredientFormState) =>
    Boolean(validation.errors[field]) && (Boolean(touchedFields[field]) || formSubmitted);

  const resetForm = () => {
    setFormState(initialFormState);
    setTouchedFields({});
    setFormSubmitted(false);
    setEditingIngredient(null);
  };

  const saveIngredient = async () => {
    setFormSubmitted(true);
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
    setCreateFormOpen(false);
    setShowSavedHint(true);
    window.setTimeout(() => {
      setShowSavedHint(false);
    }, 2200);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormState(toFormState(ingredient));
    setTouchedFields({});
    setFormSubmitted(false);
    setEditModalOpen(true);
  };

  const isUsedByRecipes = (ingredientId: string) =>
    recipes.some((recipe) =>
      recipe.sections.some((section) => section.items.some((item) => item.ingredientId === ingredientId))
    );

  const renderIngredientFields = () => (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Название ингредиента</label>
        <Input
          placeholder="Например: Сливки 33%"
          value={formState.name}
          onChange={(event) => setField("name", event.target.value)}
          onBlur={() => markFieldTouched("name")}
          className={shouldShowError("name") ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : undefined}
        />
        {shouldShowError("name") ? <p className="text-xs text-rose-500">{validation.errors.name}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Категория (опционально)</label>
        <Input
          placeholder="Например: Молочные"
          value={formState.category}
          onChange={(event) => setField("category", event.target.value)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Помогает группировать ингредиенты в списке.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Единица измерения</label>
        <select
          value={formState.baseUnit}
          onChange={(event) => setField("baseUnit", toBaseUnit(event.target.value) ?? "")}
          onBlur={() => markFieldTouched("baseUnit")}
          className={`h-11 w-full rounded-2xl border bg-white/80 px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:ring-2 dark:bg-slate-900/80 dark:text-slate-100 ${
            shouldShowError("baseUnit")
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500"
              : "border-slate-200/70 focus:border-slate-400 focus:ring-slate-200 dark:border-slate-700/70"
          }`}
        >
          <option value="">Выберите единицу</option>
          {UNIT_OPTIONS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
        {shouldShowError("baseUnit") ? <p className="text-xs text-rose-500">{validation.errors.baseUnit}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Количество в упаковке</label>
        <Input
          type="number"
          min="0.0001"
          step="0.01"
          placeholder="Например: 1000"
          value={formState.packSize}
          onChange={(event) => setField("packSize", event.target.value)}
          onBlur={() => markFieldTouched("packSize")}
          className={shouldShowError("packSize") ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : undefined}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Введите число больше 0.</p>
        {shouldShowError("packSize") ? <p className="text-xs text-rose-500">{validation.errors.packSize}</p> : null}
      </div>

      <div className="space-y-1.5 md:col-start-1">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Цена упаковки, ₽</label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Например: 320"
          value={formState.packPrice}
          onChange={(event) => setField("packPrice", event.target.value)}
          onBlur={() => markFieldTouched("packPrice")}
          className={shouldShowError("packPrice") ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : undefined}
        />
        {shouldShowError("packPrice") ? <p className="text-xs text-rose-500">{validation.errors.packPrice}</p> : null}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Цена за единицу: {computedUnitPrice} / {formState.baseUnit ? getUnitLabel(formState.baseUnit) : "—"}
        </p>
      </div>

      <div className="hidden md:block" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ингредиенты"
        description="Справочник сырья с точной ценой за единицу."
        action={
          <div className="w-full sm:w-auto">
            <Button
              onClick={() => {
                setCreateFormOpen((prev) => !prev);
                setFormSubmitted(false);
              }}
              className="w-full sm:min-w-52"
            >
              <Plus className="mr-2" size={16} />
              Добавить ингредиент
            </Button>
          </div>
        }
      />

      {createFormOpen || showSavedHint ? (
        <div className="space-y-3">
          <div
            className={`inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-emerald-100/80 px-3 text-xs font-medium text-emerald-700 transition-all dark:bg-emerald-500/20 dark:text-emerald-200 ${
              showSavedHint ? "h-6 translate-y-0 py-1 opacity-100" : "pointer-events-none h-0 -translate-y-1 px-0 py-0 opacity-0"
            }`}
            role="status"
            aria-live="polite"
          >
            <Check size={14} />
            Ингредиент сохранён
          </div>

          <div
            className={`origin-top overflow-hidden transition-all duration-300 ease-out ${
              createFormOpen ? "max-h-[900px] scale-100 opacity-100" : "max-h-0 scale-[0.98] opacity-0"
            }`}
            aria-hidden={!createFormOpen}
          >
            <GlassCard className="mt-1 space-y-5 p-6">
              <h3 className="text-lg font-semibold">Новый ингредиент</h3>
              {renderIngredientFields()}
              <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateFormOpen(false);
                    resetForm();
                  }}
                  className="min-w-32"
                >
                  Отмена
                </Button>
                <Button onClick={() => void saveIngredient()} className="min-w-44">Сохранить ингредиент</Button>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {ingredients.length > 0 ? (
        <GlassCard className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск ингредиента…"
            />
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
            >
              <option value="all">Все категории</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>
      ) : null}

      {ingredients.length === 0 ? (
        <EmptyState title="Ингредиентов пока нет" description="Добавьте первый ингредиент для расчётов себестоимости." />
      ) : filteredIngredients.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-slate-500">Ничего не найдено</GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredIngredients.map((ingredient) => {
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
                    Цена за единицу: {formatUnitCurrency(unitPrice, settings?.currency ?? "RUB")} / {getUnitLabel(ingredient.baseUnit)}
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
        className="w-full max-w-[720px] max-h-[85vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl"
        containerClassName="fixed inset-0 z-[9999] h-full w-full"
        headerClassName="shrink-0 space-y-1 px-8 pt-8"
        bodyClassName="mt-4 max-h-[calc(85vh-210px)] overflow-y-auto p-8 pt-0"
        footerClassName="mt-4 flex w-full justify-end gap-3 border-t border-slate-200/70 px-8 pb-8 pt-5"
        showCloseButton
        footer={
          <>
            <Button
              variant="outline"
              className="min-w-32 rounded-2xl"
              onClick={() => {
                setEditModalOpen(false);
                resetForm();
              }}
            >
              Отмена
            </Button>
            <Button className="min-w-32 rounded-2xl" onClick={() => void saveIngredient()}>Сохранить</Button>
          </>
        }
      >
        {renderIngredientFields()}
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
        className="w-full max-w-[520px] rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8"
        containerClassName="fixed inset-0 z-[9999] h-full w-full"
        footerClassName="mt-6 flex w-full"
        footer={<Button className="w-full rounded-2xl" onClick={() => setBlockedDeleteIngredient(null)}>Понятно</Button>}
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
