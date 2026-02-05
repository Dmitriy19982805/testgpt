import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import type { BaseUnit, Ingredient, Recipe, RecipeItem } from "../../db/types";
import { formatCurrency } from "../../utils/currency";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { CenterModal } from "../../components/common/CenterModal";
import { ActionMenu } from "../../components/common/ActionMenu";
import {
  detectRecipeName,
  getRecipeCosts,
  getRecipeItemCost,
  getUnitLabel,
  parseRecipeFromText,
  UNIT_OPTIONS,
  type ParsedPdfIngredientRow,
} from "./recipeUtils";

interface RecipeFormState {
  name: string;
  category: string;
  yieldAmount: string;
  yieldUnit: BaseUnit;
  notes: string;
  items: RecipeItem[];
}

interface RecipeValidation {
  name?: string;
  yieldAmount?: string;
  items?: string;
  mismatch?: string;
}

const initialRecipeForm: RecipeFormState = {
  name: "",
  category: "",
  yieldAmount: "",
  yieldUnit: "g",
  notes: "",
  items: [],
};

function validateRecipe(form: RecipeFormState, ingredients: Ingredient[]) {
  const errors: RecipeValidation = {};
  if (!form.name.trim()) {
    errors.name = "Введите название рецепта.";
  }

  const yieldAmount = Number(form.yieldAmount);
  if (!form.yieldAmount || !Number.isFinite(yieldAmount) || yieldAmount <= 0) {
    errors.yieldAmount = "Укажите выход больше 0.";
  }
  if (form.items.length === 0) {
    errors.items = "Добавьте хотя бы один ингредиент в рецепт.";
  }

  const hasMismatch = form.items.some((item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    return ingredient && ingredient.baseUnit !== item.unit;
  });
  if (hasMismatch) {
    errors.mismatch = "Единицы измерения ингредиентов и позиций рецепта должны совпадать.";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    parsed: {
      name: form.name.trim(),
      category: form.category.trim(),
      yieldAmount,
      yieldUnit: form.yieldUnit,
      notes: form.notes.trim(),
      items: form.items,
    },
  };
}

function toForm(recipe: Recipe): RecipeFormState {
  return {
    name: recipe.name,
    category: recipe.category ?? "",
    yieldAmount: String(recipe.yieldAmount),
    yieldUnit: recipe.yieldUnit,
    notes: recipe.notes ?? "",
    items: recipe.items,
  };
}

function extractPdfTextBestEffort(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const content = new TextDecoder("latin1").decode(bytes);
  const matches = Array.from(content.matchAll(/\(([^)]{2,500})\)/g));
  const text = matches
    .map((match) => match[1].replace(/\\[nrt]/g, " ").replace(/\\\(/g, "(").replace(/\\\)/g, ")"))
    .join("\n")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text;
}

export function RecipesPage() {
  const { recipes, ingredients, settings, addRecipe, updateRecipe, deleteRecipe, addIngredient } = useAppStore();
  const [formState, setFormState] = useState<RecipeFormState>(initialRecipeForm);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Recipe | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const [builderIngredientId, setBuilderIngredientId] = useState("");
  const [builderAmount, setBuilderAmount] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState("");
  const [builderError, setBuilderError] = useState("");

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfParseRows, setPdfParseRows] = useState<ParsedPdfIngredientRow[]>([]);
  const [pdfMessage, setPdfMessage] = useState("");

  const filteredIngredients = useMemo(() => {
    const query = ingredientFilter.trim().toLowerCase();
    if (!query) {
      return ingredients;
    }
    return ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(query));
  }, [ingredientFilter, ingredients]);

  const validation = useMemo(() => validateRecipe(formState, ingredients), [formState, ingredients]);

  const recipeTotals = useMemo(() => {
    const draftRecipe: Recipe = {
      id: "draft",
      name: formState.name,
      category: formState.category,
      yieldAmount: Number(formState.yieldAmount || 0),
      yieldUnit: formState.yieldUnit,
      notes: formState.notes,
      items: formState.items,
      createdAt: "",
      updatedAt: "",
    };
    return getRecipeCosts(draftRecipe, ingredients);
  }, [formState, ingredients]);

  const resetForm = () => {
    setFormState(initialRecipeForm);
    setEditingRecipe(null);
    setBuilderIngredientId("");
    setBuilderAmount("");
    setIngredientFilter("");
    setBuilderError("");
    setShowErrors(false);
  };

  const saveRecipe = async () => {
    setShowErrors(true);
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

  const addBuilderItem = () => {
    setBuilderError("");
    const ingredient = ingredients.find((item) => item.id === builderIngredientId);
    const amount = Number(builderAmount);

    if (!ingredient) {
      setBuilderError("Выберите ингредиент.");
      return;
    }
    if (!builderAmount || !Number.isFinite(amount) || amount <= 0) {
      setBuilderError("Введите количество больше 0.");
      return;
    }

    setFormState((prev) => {
      const existing = prev.items.find((item) => item.ingredientId === ingredient.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.ingredientId === ingredient.id
              ? { ...item, amount: Number((item.amount + amount).toFixed(3)) }
              : item
          ),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { ingredientId: ingredient.id, amount, unit: ingredient.baseUnit }],
      };
    });

    setBuilderAmount("");
  };

  const removeBuilderItem = (ingredientId: string) => {
    setFormState((prev) => ({ ...prev, items: prev.items.filter((item) => item.ingredientId !== ingredientId) }));
  };

  const openCreate = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormState(toForm(recipe));
    setShowErrors(false);
    setShowFormModal(true);
  };

  const parsePdfText = () => {
    const parsed = parseRecipeFromText(pdfText);
    setPdfParseRows(parsed);
    if (parsed.length === 0) {
      setPdfMessage("Не удалось распознать строки ингредиентов. Проверьте текст и формат.");
    } else {
      setPdfMessage(`Найдено позиций: ${parsed.length}`);
    }
  };

  const importPdfRows = async () => {
    if (pdfParseRows.length === 0) {
      setPdfMessage("Нет распознанных ингредиентов для импорта.");
      return;
    }

    const items: RecipeItem[] = [];
    for (const row of pdfParseRows) {
      let ingredient = ingredients.find((entry) => entry.name.toLowerCase() === row.name.toLowerCase());
      if (!ingredient) {
        ingredient = await addIngredient({
          name: row.name,
          category: "Импорт PDF",
          baseUnit: row.unit,
          packSize: 1,
          packPrice: 0,
          lossPct: 0,
        });
      }
      if (ingredient.baseUnit !== row.unit) {
        setPdfMessage(`Не найден ингредиент с единицей ${getUnitLabel(row.unit)}: ${row.name}`);
        return;
      }
      items.push({ ingredientId: ingredient.id, amount: row.amount, unit: row.unit });
    }

    setFormState({
      name: detectRecipeName(pdfText),
      category: "Импорт PDF",
      yieldAmount: "",
      yieldUnit: "g",
      notes: "Импортировано из PDF",
      items,
    });
    setPdfModalOpen(false);
    setShowFormModal(true);
  };

  const handlePdfSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const extractedText = extractPdfTextBestEffort(buffer);
      if (!extractedText) {
        setPdfText("");
        setPdfMessage("Не удалось извлечь текст из PDF. Вставьте текст вручную.");
      } else {
        setPdfText(extractedText);
        setPdfMessage("Текст успешно извлечён. Проверьте и нажмите «Parse». ");
      }
      setPdfParseRows([]);
      setPdfModalOpen(true);
    } catch {
      setPdfText("");
      setPdfParseRows([]);
      setPdfMessage("Не удалось извлечь текст из PDF. Вставьте текст вручную.");
      setPdfModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Рецепты"
        description="Себестоимость по ингредиентам и контроль выхода."
        action={
          <div className="flex items-center gap-2">
            <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfSelect} />
            <Button variant="outline" onClick={() => pdfInputRef.current?.click()}>
              <Upload size={16} /> Импорт из PDF
            </Button>
            <Button onClick={openCreate}>Новый рецепт</Button>
          </div>
        }
      />

      {recipes.length === 0 ? (
        <EmptyState title="Рецептов пока нет" description="Создайте рецепт вручную или импортируйте из PDF." actionLabel="Новый рецепт" onAction={openCreate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recipes.map((recipe) => {
            const totals = getRecipeCosts(recipe, ingredients);
            return (
              <GlassCard key={recipe.id} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{recipe.name}</h3>
                    <p className="text-sm text-slate-500">Выход: {recipe.yieldAmount} {getUnitLabel(recipe.yieldUnit)}</p>
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
                      }
                    }}
                    anchorEl={activeMenuId === recipe.id ? menuAnchor : null}
                    onEdit={() => openEdit(recipe)}
                    onDelete={() => setConfirmDelete(recipe)}
                  />
                </div>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p>Себестоимость: {formatCurrency(totals.recipeTotalCost, settings?.currency ?? "RUB")}</p>
                  <p>
                    Стоимость за {getUnitLabel(recipe.yieldUnit)}: {formatCurrency(totals.costPerYieldUnit, settings?.currency ?? "RUB")}
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
        title={editingRecipe ? "Редактирование рецепта" : "Новый рецепт"}
        description="Заполните карточку и добавьте ингредиенты в билдере"
        className="glass-card w-[92vw] max-w-[760px] rounded-2xl border border-white/40 px-6 py-6"
        bodyClassName="mt-4 max-h-[66vh] space-y-4 overflow-y-auto pr-1"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setShowFormModal(false)}>Отмена</Button>
            <Button className="flex-1" disabled={!validation.isValid} onClick={() => void saveRecipe()}>Сохранить рецепт</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Input placeholder="Название рецепта" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} />
            {showErrors && validation.errors.name ? <p className="text-xs text-rose-500">{validation.errors.name}</p> : null}
          </div>
          <Input placeholder="Категория (опционально)" value={formState.category} onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))} />
          <Input placeholder="Выход" type="number" min="0.0001" step="0.01" value={formState.yieldAmount} onChange={(event) => setFormState((prev) => ({ ...prev, yieldAmount: event.target.value }))} />
          <select value={formState.yieldUnit} onChange={(event) => setFormState((prev) => ({ ...prev, yieldUnit: event.target.value as BaseUnit }))} className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm md:col-span-2">
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
          <div className="md:col-span-2">
            <Input placeholder="Заметки" value={formState.notes} onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>
          {showErrors && validation.errors.yieldAmount ? <p className="text-xs text-rose-500 md:col-span-2">{validation.errors.yieldAmount}</p> : null}
        </div>

        <GlassCard className="space-y-3 p-4">
          <h4 className="font-semibold">Recipe Builder</h4>
          <Input placeholder="Поиск ингредиента" value={ingredientFilter} onChange={(event) => setIngredientFilter(event.target.value)} />
          <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
            <select value={builderIngredientId} onChange={(event) => setBuilderIngredientId(event.target.value)} className="h-11 rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm">
              <option value="">Выберите ингредиент</option>
              {filteredIngredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({getUnitLabel(ingredient.baseUnit)})</option>
              ))}
            </select>
            <Input type="number" min="0.0001" step="0.01" placeholder="Количество" value={builderAmount} onChange={(event) => setBuilderAmount(event.target.value)} />
            <Button onClick={addBuilderItem}><Plus className="mr-2" size={15} />Добавить</Button>
          </div>
          {builderError ? <p className="text-xs text-rose-500">{builderError}</p> : null}

          {formState.items.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет добавленных позиций.</p>
          ) : (
            <div className="space-y-2">
              {formState.items.map((item) => {
                const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
                const itemCost = getRecipeItemCost(item, ingredient);
                const unitMismatch = ingredient ? ingredient.baseUnit !== item.unit : false;
                return (
                  <div key={item.ingredientId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{ingredient?.name ?? "Не найден ингредиент"}</p>
                      <p className="text-xs text-slate-500">
                        {item.amount} {getUnitLabel(item.unit)} • {formatCurrency(itemCost, settings?.currency ?? "RUB")}
                      </p>
                      {unitMismatch ? <p className="text-xs text-rose-500">Единица в рецепте не совпадает с базовой единицей ингредиента.</p> : null}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => removeBuilderItem(item.ingredientId)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {showErrors && validation.errors.items ? <p className="text-xs text-rose-500">{validation.errors.items}</p> : null}
          {showErrors && validation.errors.mismatch ? <p className="text-xs text-rose-500">{validation.errors.mismatch}</p> : null}

          <div className="rounded-2xl bg-slate-100/70 p-3 text-sm dark:bg-slate-800/50">
            <p>Итого: {formatCurrency(recipeTotals.recipeTotalCost, settings?.currency ?? "RUB")}</p>
            <p>
              За {getUnitLabel(formState.yieldUnit)}: {formatCurrency(recipeTotals.costPerYieldUnit, settings?.currency ?? "RUB")}
            </p>
          </div>
        </GlassCard>
      </CenterModal>

      <CenterModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        title="Импорт рецепта"
        description="Проверьте извлечённый текст и распознайте ингредиенты"
        className="glass-card w-[92vw] max-w-[900px] rounded-2xl border border-white/40 px-6 py-6"
        bodyClassName="mt-4 max-h-[68vh] space-y-4 overflow-y-auto"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setPdfModalOpen(false)}>Отмена</Button>
            <Button className="flex-1" onClick={() => void importPdfRows()}>Создать черновик</Button>
          </>
        }
      >
        <textarea
          className="min-h-44 w-full rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-sm outline-none"
          value={pdfText}
          onChange={(event) => setPdfText(event.target.value)}
          placeholder="Вставьте текст рецепта..."
        />
        {pdfMessage ? <p className="text-sm text-slate-500">{pdfMessage}</p> : null}
        <Button onClick={parsePdfText}>Parse</Button>

        {pdfParseRows.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Ингредиент</th>
                  <th className="px-3 py-2">Количество</th>
                  <th className="px-3 py-2">Ед.</th>
                </tr>
              </thead>
              <tbody>
                {pdfParseRows.map((row, index) => (
                  <tr key={`${row.name}-${index}`} className="border-t border-slate-200/60">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.amount}</td>
                    <td className="px-3 py-2">{getUnitLabel(row.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
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
        }}
      />
    </div>
  );
}
