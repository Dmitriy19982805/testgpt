import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GlassCard } from "../../components/common/GlassCard";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { useAppStore } from "../../store/useAppStore";
import { toBaseUnit, type BaseUnit, type Recipe, type RecipeItem, type RecipeSection } from "../../db/types";
import { formatCurrency } from "../../utils/currency";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { CenterModal } from "../../components/common/CenterModal";
import { ActionMenu } from "../../components/common/ActionMenu";
import { getIngredientUnitPrice, getRecipeCosts, getSectionEffectiveCost, getUnitLabel, UNIT_OPTIONS } from "./recipeUtils";
import { IngredientSelect } from "./IngredientSelect";

interface EditableRecipeItem {
  id: string;
  ingredientId: string;
  ingredientQuery: string;
  quantity: string;
}

interface EditableSection {
  id: string;
  name: string;
  notes: string;
  outputAmount: string;
  outputUnit: BaseUnit;
  usageAmount: string;
  items: EditableRecipeItem[];
}

interface RecipeFormState {
  name: string;
  category: string;
  notes: string;
  fileName: string;
  fileUrl: string;
  sections: EditableSection[];
}

const initialRecipeForm: RecipeFormState = {
  name: "",
  category: "",
  notes: "",
  fileName: "",
  fileUrl: "",
  sections: [],
};

const SECTION_OUTPUT_UNITS: BaseUnit[] = ["g", "ml"];

const createDraftItem = (): EditableRecipeItem => ({ id: crypto.randomUUID(), ingredientId: "", ingredientQuery: "", quantity: "" });

const createDraftSection = (): EditableSection => ({
  id: crypto.randomUUID(),
  name: "",
  notes: "",
  outputAmount: "",
  outputUnit: "g",
  usageAmount: "",
  items: [createDraftItem()],
});

function toForm(recipe: Recipe): RecipeFormState {
  return {
    name: recipe.name,
    category: recipe.category ?? "",
    notes: recipe.notes ?? "",
    fileName: recipe.fileName ?? "",
    fileUrl: recipe.fileUrl ?? "",
    sections: recipe.sections.map((section) => ({
      id: section.id,
      name: section.name,
      notes: section.notes ?? "",
      outputAmount: section.outputAmount ? String(section.outputAmount) : "",
      outputUnit: section.outputUnit ?? "g",
      usageAmount: section.usageAmount ? String(section.usageAmount) : "",
      items: (section.items ?? []).map((item) => ({
        id: crypto.randomUUID(),
        ingredientId: item.ingredientId,
        ingredientQuery: "",
        quantity: String(item.amount),
      })),
    })),
  };
}

export function RecipesPage() {
  const { recipes, ingredients, orders, settings, addRecipe, updateRecipe, deleteRecipe } = useAppStore();
  const [formState, setFormState] = useState<RecipeFormState>(initialRecipeForm);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Recipe | null>(null);
  const [blockedDeleteRecipe, setBlockedDeleteRecipe] = useState<Recipe | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [newSectionIdToFocus, setNewSectionIdToFocus] = useState<string | null>(null);
  const [visibleDescriptions, setVisibleDescriptions] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sectionDescriptionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const formatRecipePrice = (value: number) => formatCurrency(value, settings?.currency ?? "RUB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const updateSection = (sectionId: string, patch: Partial<EditableSection>) => {
    setFormState((prev) => ({ ...prev, sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)) }));
  };

  const updateSectionItem = (sectionId: string, itemId: string, patch: Partial<EditableRecipeItem>) => {
    setFormState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }
          : section
      ),
    }));
  };

  const validation = useMemo(() => {
    const errors: string[] = [];
    const parsedSections: RecipeSection[] = [];

    if (!formState.name.trim()) {
      errors.push("Введите название рецепта.");
    }

    if (formState.sections.length === 0) {
      errors.push("Добавьте хотя бы одну секцию.");
    }

    formState.sections.forEach((section, index) => {
      if (!section.name.trim()) {
        errors.push(`Секция #${index + 1}: укажите название.`);
        return;
      }

      const outputAmount = Number(section.outputAmount);
      const usageAmount = Number(section.usageAmount);

      const items: RecipeItem[] = section.items
        .map((item) => {
          const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
          const amount = Number(item.quantity);
          if (!ingredient || !Number.isFinite(amount) || amount <= 0) {
            return null;
          }
          return { ingredientId: ingredient.id, amount, unit: ingredient.baseUnit, rowCost: getIngredientUnitPrice(ingredient) * amount };
        })
        .filter(Boolean) as RecipeItem[];

      if (items.length === 0) {
        errors.push(`Секция «${section.name}»: добавьте минимум один ингредиент.`);
        return;
      }

      parsedSections.push({
        id: section.id,
        name: section.name.trim(),
        notes: section.notes.trim(),
        outputAmount: Number.isFinite(outputAmount) && outputAmount > 0 ? outputAmount : undefined,
        outputUnit: Number.isFinite(outputAmount) && outputAmount > 0 ? section.outputUnit : undefined,
        usageAmount: Number.isFinite(usageAmount) && usageAmount > 0 ? usageAmount : undefined,
        items,
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      parsed: {
        name: formState.name.trim(),
        category: formState.category.trim(),
        notes: formState.notes.trim(),
        fileName: formState.fileName,
        fileUrl: formState.fileUrl,
        sections: parsedSections,
      },
    };
  }, [formState, ingredients]);

  const sectionCosts = useMemo(() => {
    return formState.sections.reduce<Record<string, number>>((costs, section) => {
      const sectionCost = section.items.reduce((sum, item) => {
        const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
        const quantity = Number(item.quantity);
        const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
        const ingredientCost = ingredient ? getIngredientUnitPrice(ingredient) * safeQuantity : 0;
        return sum + (Number.isFinite(ingredientCost) ? ingredientCost : 0);
      }, 0);
      costs[section.id] = Number.isFinite(sectionCost) ? sectionCost : 0;
      return costs;
    }, {});
  }, [formState.sections, ingredients]);

  const draftRecipeCosts = useMemo(() => {
    const recipeTotalCost = Object.values(sectionCosts).reduce((sum, sectionCost) => sum + sectionCost, 0);

    const outputSection = formState.sections.find((section) => {
      const outputAmount = Number(section.outputAmount);
      return Number.isFinite(outputAmount) && outputAmount > 0;
    });
    const outputAmount = outputSection ? Number(outputSection.outputAmount) : 0;
    const costPerYieldUnit = outputAmount > 0 ? recipeTotalCost / outputAmount : 0;

    return {
      recipeTotalCost: Number.isFinite(recipeTotalCost) ? recipeTotalCost : 0,
      costPerYieldUnit: Number.isFinite(costPerYieldUnit) ? costPerYieldUnit : 0,
    };
  }, [formState.sections, sectionCosts]);

  const resetForm = () => {
    setFormState(initialRecipeForm);
    setEditingRecipe(null);
    setFormSubmitted(false);
    setVisibleDescriptions({});
  };

  const openCreate = () => {
    resetForm();
    const initialSection = createDraftSection();
    setFormState((prev) => ({ ...prev, sections: [initialSection] }));
    setVisibleDescriptions({ [initialSection.id]: false });
    setNewSectionIdToFocus(initialSection.id);
    setShowFormModal(true);
  };

  const openEdit = (recipe: Recipe) => {
    const nextForm = toForm(recipe);
    setEditingRecipe(recipe);
    setFormState(nextForm);
    setVisibleDescriptions(
      nextForm.sections.reduce<Record<string, boolean>>((acc, section) => {
        acc[section.id] = Boolean(section.notes.trim());
        return acc;
      }, {})
    );
    setNewSectionIdToFocus(null);
    setFormSubmitted(false);
    setShowFormModal(true);
  };

  const openView = (recipe: Recipe) => {
    setActiveMenuId(null);
    setMenuAnchor(null);
    setViewingRecipe(recipe);
  };

  const openEditFromView = (recipe: Recipe) => {
    setViewingRecipe(null);
    openEdit(recipe);
  };

  const addSection = () => {
    const newSection = createDraftSection();
    setFormState((prev) => ({ ...prev, sections: [newSection, ...prev.sections] }));
    setVisibleDescriptions((prev) => ({ ...prev, [newSection.id]: false }));
    setNewSectionIdToFocus(newSection.id);
  };

  const toggleSectionDescription = (sectionId: string, nextState: boolean) => {
    setVisibleDescriptions((prev) => ({ ...prev, [sectionId]: nextState }));
    if (nextState) {
      requestAnimationFrame(() => {
        sectionDescriptionRefs.current[sectionId]?.focus();
      });
    }
  };

  useEffect(() => {
    setVisibleDescriptions((prev) => {
      const next: Record<string, boolean> = {};
      formState.sections.forEach((section) => {
        next[section.id] = prev[section.id] ?? Boolean(section.notes.trim());
      });
      return next;
    });
  }, [formState.sections]);

  useEffect(() => {
    if (!showFormModal || !newSectionIdToFocus) {
      return;
    }
    const scrollContainer = document.querySelector(".recipes-form-modal-body");
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [showFormModal, newSectionIdToFocus]);

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
    setFormState((prev) => ({ ...prev, fileName: file.name, fileUrl: dataUrl }));
  };

  const isDeleteBlocked = (recipeId: string) => orders.some((order) => order.recipeId === recipeId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Рецепты"
        description="Секционные рецепты с точным расчётом себестоимости."
        action={<Button onClick={openCreate}><Plus className="mr-2" size={16} />Добавить рецепт</Button>}
      />

      {recipes.length === 0 ? (
        <EmptyState title="Рецептов пока нет" description="Создайте первый секционный рецепт." actionLabel="Добавить рецепт" onAction={openCreate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => {
            const totals = getRecipeCosts(recipe, ingredients);
            return (
              <GlassCard
                key={recipe.id}
                className="space-y-3 rounded-2xl border border-white/50 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
                role="button"
                tabIndex={0}
                onClick={() => openView(recipe)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openView(recipe);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">{recipe.name}</h3>
                    <p className="text-sm text-slate-500">{recipe.category?.trim() || "Без категории"}</p>
                    <p className="text-sm text-slate-600">Секций: {recipe.sections.length}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveMenuId(recipe.id);
                      setMenuAnchor(event.currentTarget);
                    }}
                  >
                    <MoreVertical size={16} />
                  </Button>
                  <ActionMenu
                    open={activeMenuId === recipe.id}
                    onOpenChange={(open) => { if (!open) { setActiveMenuId(null); setMenuAnchor(null); } }}
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
                  {recipe.sections.map((section) => (
                    <p key={section.id}>{section.name}: {formatRecipePrice(getSectionEffectiveCost(section, ingredients))}</p>
                  ))}
                  <p className="font-medium">Итого: {formatRecipePrice(totals.recipeTotalCost)}</p>
                  {totals.costPerYieldUnit > 0 ? <p>Себестоимость за единицу: {formatRecipePrice(totals.costPerYieldUnit)}</p> : null}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <CenterModal
        open={Boolean(viewingRecipe)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingRecipe(null);
          }
        }}
        title={viewingRecipe?.name ?? "Рецепт"}
        className="w-[95vw] max-w-[920px] rounded-3xl border border-slate-200/70 bg-white px-6 py-6"
        bodyClassName="mt-5 max-h-[72vh] space-y-5 overflow-y-auto pr-1"
        footer={
          viewingRecipe ? (
            <>
              <Button className="flex-1" onClick={() => openEditFromView(viewingRecipe)}>Редактировать рецепт</Button>
              <Button variant="outline" className="flex-1" onClick={() => setViewingRecipe(null)}>Закрыть</Button>
            </>
          ) : null
        }
        showCloseButton
      >
        {viewingRecipe ? (
          <>
            <section className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Категория:</span>{" "}
                {viewingRecipe.category?.trim() || "Без категории"}
              </p>
            </section>

            <section className="space-y-3">
              {viewingRecipe.sections.map((section) => {
                const sectionCost = getSectionEffectiveCost(section, ingredients);
                return (
                  <article key={section.id} className="space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{section.name}</h3>
                      <p className="text-sm font-medium text-slate-800">{formatRecipePrice(sectionCost)}</p>
                    </div>
                    {section.notes.trim() ? (
                      <p className="whitespace-pre-line text-xs text-slate-500">{section.notes.trim()}</p>
                    ) : null}
                    <ul className="space-y-2 text-sm text-slate-700">
                      {section.items.map((item, itemIndex) => {
                        const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
                        return (
                          <li key={`${section.id}-${item.ingredientId}-${item.amount}-${itemIndex}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                            <span>{ingredient?.name ?? "Ингредиент удалён"}</span>
                            <span className="whitespace-nowrap text-slate-600">
                              {item.amount} {getUnitLabel(item.unit)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                );
              })}
            </section>

            <section className="rounded-2xl bg-slate-100/80 p-4 text-sm font-medium text-slate-800">
              Итого себестоимость: {formatRecipePrice(getRecipeCosts(viewingRecipe, ingredients).recipeTotalCost)}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-500">PDF</h3>
              {viewingRecipe.fileUrl ? (
                <>
                  <div className="h-[340px] overflow-hidden rounded-2xl border border-slate-200/70">
                    <iframe src={viewingRecipe.fileUrl} title={`PDF ${viewingRecipe.name}`} className="h-full w-full" />
                  </div>
                  <Button variant="outline" onClick={() => window.open(viewingRecipe.fileUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="mr-2" size={14} />Открыть PDF в новой вкладке
                  </Button>
                </>
              ) : (
                <p className="text-sm text-slate-500">PDF не прикреплён</p>
              )}
            </section>
          </>
        ) : null}
      </CenterModal>

      <CenterModal
        open={showFormModal}
        onOpenChange={(open) => {
          setShowFormModal(open);
          if (!open) {
            resetForm();
            setNewSectionIdToFocus(null);
          }
        }}
        title={editingRecipe ? "Редактировать рецепт" : "Добавить рецепт"}
        className="w-[95vw] max-w-[920px] rounded-3xl border border-slate-200/70 bg-white px-6 py-6"
        bodyClassName="recipes-form-modal-body mt-5 max-h-[72vh] space-y-6 overflow-y-auto pr-1"
        footer={<><Button variant="outline" className="flex-1" onClick={() => setShowFormModal(false)}>Отмена</Button><Button className="flex-1" onClick={() => void saveRecipe()}>Сохранить</Button></>}
      >
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2"><label className="text-sm font-medium text-slate-700">Название</label><Input value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} placeholder="Например: Three Chocolate Cake" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Категория</label><Input value={formState.category} onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))} placeholder="Торты" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Общие заметки</label><Input value={formState.notes} onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Опционально" /></div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold uppercase text-slate-500">Секции рецепта</h3><Button type="button" variant="outline" onClick={addSection}><Plus className="mr-2" size={14} />Добавить секцию</Button></div>
          {formState.sections.map((section, sectionIndex) => {
            const sectionCost = sectionCosts[section.id] ?? 0;
            return (
              <div key={section.id} className="space-y-3 rounded-2xl border border-slate-200/80 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
                  <div className="space-y-1"><label className="text-xs text-slate-500">Название секции</label><Input autoFocus={newSectionIdToFocus === section.id} value={section.name} onChange={(event) => updateSection(section.id, { name: event.target.value })} onFocus={() => { if (newSectionIdToFocus === section.id) { setNewSectionIdToFocus(null); } }} /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-500">Выход (опц.)</label><Input type="number" min="0.01" step="0.01" value={section.outputAmount} onChange={(event) => updateSection(section.id, { outputAmount: event.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-500">Используем в финале (опц.)</label><Input type="number" min="0.01" step="0.01" value={section.usageAmount} onChange={(event) => updateSection(section.id, { usageAmount: event.target.value })} /></div>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setFormState((prev) => ({ ...prev, sections: prev.sections.map((s, i, arr) => (i === sectionIndex && i > 0 ? arr[i - 1] : i === sectionIndex - 1 ? arr[i + 1] : s)) }))}><ArrowUp size={14} /></Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setFormState((prev) => ({ ...prev, sections: prev.sections.map((s, i, arr) => (i === sectionIndex && i < arr.length - 1 ? arr[i + 1] : i === sectionIndex + 1 ? arr[i - 1] : s)) }))}><ArrowDown size={14} /></Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setFormState((prev) => ({ ...prev, sections: prev.sections.filter((entry) => entry.id !== section.id) }))}><Trash2 size={14} /></Button>
                  </div>
                </div>

                <div className="space-y-1 max-w-[220px]"><label className="text-xs text-slate-500">Ед. выхода</label><select value={section.outputUnit} onChange={(event) => updateSection(section.id, { outputUnit: toBaseUnit(event.target.value) ?? "g" })} className="h-11 w-full rounded-2xl border border-slate-200/70 px-4 text-sm">{UNIT_OPTIONS.filter((unit) => SECTION_OUTPUT_UNITS.includes(unit.value)).map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div>

                <div className="space-y-3">
                    {section.items.map((item) => {
                      const selectedIngredient = ingredients.find((entry) => entry.id === item.ingredientId);
                      const quantity = Number(item.quantity);
                      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
                      const ingredientCost = selectedIngredient ? getIngredientUnitPrice(selectedIngredient) * safeQuantity : 0;
                      return (
                        <div key={item.id} className="grid gap-3 md:grid-cols-[1.2fr_0.6fr_100px_140px_auto] md:items-end">
                          <IngredientSelect
                            ingredients={ingredients}
                            selectedIngredientId={item.ingredientId}
                            query={item.ingredientQuery || selectedIngredient?.name || ""}
                            currency={settings?.currency ?? "RUB"}
                            excludedIngredientIds={new Set()}
                            onQueryChange={(nextQuery) => updateSectionItem(section.id, item.id, { ingredientId: "", ingredientQuery: nextQuery })}
                            onInputBlur={(rawQuery) => {
                              const matched = ingredients.find((ingredient) => ingredient.name.toLowerCase() === rawQuery.trim().toLowerCase());
                              if (matched) {
                                updateSectionItem(section.id, item.id, { ingredientId: matched.id, ingredientQuery: "" });
                              }
                            }}
                            onSelect={(ingredient) => updateSectionItem(section.id, item.id, { ingredientId: ingredient.id, ingredientQuery: "" })}
                            onDuplicateAttempt={() => undefined}
                            onInteract={() => undefined}
                          />
                          <div className="space-y-1"><label className="text-xs text-slate-500">Количество</label><Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateSectionItem(section.id, item.id, { quantity: event.target.value })} /></div>
                          <div className="h-11 rounded-xl border border-slate-200/70 bg-slate-50 px-3 text-sm flex items-center">{selectedIngredient ? getUnitLabel(selectedIngredient.baseUnit) : "—"}</div>
                          <div className="h-11 rounded-xl border border-slate-200/70 bg-slate-50 px-3 text-sm flex items-center justify-end text-slate-700">{formatRecipePrice(ingredientCost)}</div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => updateSection(section.id, { items: section.items.filter((entry) => entry.id !== item.id) })}><Trash2 size={15} /></Button>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button type="button" variant="outline" onClick={() => updateSection(section.id, { items: [...section.items, createDraftItem()] })}>
                        <Plus className="mr-2" size={14} />Добавить ингредиент
                      </Button>
                      <div className="flex w-full justify-end gap-2 sm:w-auto">
                        <Button type="button" variant="outline" onClick={() => toggleSectionDescription(section.id, !visibleDescriptions[section.id])}>
                          {visibleDescriptions[section.id] ? "Скрыть описание" : <><Plus className="mr-2" size={14} />Добавить описание</>}
                        </Button>
                        {visibleDescriptions[section.id] && section.notes.trim() ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => updateSection(section.id, { notes: "" })}>
                            Очистить
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                <div className="space-y-2">
                  <div className={`grid transition-all duration-300 ease-out ${visibleDescriptions[section.id] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <div className="space-y-1 rounded-2xl border border-slate-200/70 bg-white p-3">
                        <label className="text-xs text-slate-500">Описание / заметки</label>
                        <textarea
                          ref={(node) => {
                            sectionDescriptionRefs.current[section.id] = node;
                          }}
                          value={section.notes}
                          onChange={(event) => updateSection(section.id, { notes: event.target.value })}
                          className="min-h-20 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">Себестоимость секции: {formatRecipePrice(sectionCost)}</p>
              </div>
            );
          })}
        </section>

        <section className="space-y-3"><h3 className="text-sm font-semibold uppercase text-slate-500">Файл (опционально)</h3><input ref={fileInputRef} type="file" accept="application/pdf" onChange={(event) => void handleFileUpload(event)} className="hidden" /><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2" size={14} />Загрузить PDF</Button>{formState.fileName ? <p className="text-sm text-slate-600">{formState.fileName}</p> : null}</section>

        {formSubmitted && validation.errors.length > 0 ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{validation.errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
        <div className="rounded-2xl bg-slate-100/80 p-4 text-sm"><p>Итого себестоимость: {formatRecipePrice(draftRecipeCosts.recipeTotalCost)}</p>{draftRecipeCosts.costPerYieldUnit > 0 ? <p>Себестоимость за единицу: {formatRecipePrice(draftRecipeCosts.costPerYieldUnit)}</p> : null}</div>
      </CenterModal>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => { if (!open) { setConfirmDelete(null); } }}
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
        onOpenChange={(open) => { if (!open) { setBlockedDeleteRecipe(null); } }}
        title="Удаление недоступно"
        description="Рецепт используется в заказах и не может быть удалён."
        className="w-[92vw] max-w-[460px] rounded-3xl border border-slate-200/70 bg-white px-6 py-6"
        footer={<Button className="w-full" onClick={() => setBlockedDeleteRecipe(null)}>Понятно</Button>}
      />
    </div>
  );
}
