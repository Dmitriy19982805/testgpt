import type {
  BaseUnit,
  Ingredient,
  Recipe,
  RecipeItem,
  RecipeResult,
  RecipeResultType,
  RecipeResultUnit,
  RecipeSection,
} from "../../db/types";

export interface ProductTypeOption {
  value: string;
  label: string;
}

export const UNIT_OPTIONS: Array<{ label: string; value: BaseUnit }> = [
  { label: "г", value: "g" },
  { label: "мл", value: "ml" },
  { label: "шт", value: "pcs" },
];

export const RECIPE_RESULT_TYPE_OPTIONS: Array<{ label: string; value: RecipeResultType }> = [
  { label: "Вес", value: "weight" },
  { label: "Количество", value: "quantity" },
];

export const RECIPE_RESULT_UNIT_OPTIONS: Record<RecipeResultType, Array<{ label: string; value: RecipeResultUnit }>> = {
  weight: [
    { label: "г", value: "g" },
    { label: "кг", value: "kg" },
  ],
  quantity: [{ label: "шт", value: "pcs" }],
};

export function getUnitLabel(unit: BaseUnit): string {
  return UNIT_OPTIONS.find((item) => item.value === unit)?.label ?? unit;
}

export function getRecipeResultUnitLabel(unit: RecipeResultUnit): string {
  if (unit === "kg") {
    return "кг";
  }
  if (unit === "pcs") {
    return "шт";
  }
  return "г";
}

export function formatRecipeResult(result: RecipeResult): string {
  return `${result.value} ${getRecipeResultUnitLabel(result.unit)}`;
}

export function getIngredientUnitPrice(ingredient: Ingredient): number {
  const packSize = Number(ingredient.packSize);
  const packPrice = Number(ingredient.packPrice);
  if (!Number.isFinite(packSize) || packSize <= 0 || !Number.isFinite(packPrice) || packPrice <= 0) {
    return 0;
  }
  const unitPrice = packPrice / packSize;
  return Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
}

export function getRecipeItemCost(item: RecipeItem, ingredient?: Ingredient): number {
  if (!ingredient || ingredient.packSize <= 0) {
    return 0;
  }
  const unitPrice = getIngredientUnitPrice(ingredient);
  const safeAmount = Number.isFinite(item.amount) && item.amount > 0 ? item.amount : 0;
  const cost = safeAmount * unitPrice;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

function normalizeSection(section: RecipeSection): RecipeSection {
  return {
    ...section,
    items: section.items ?? [],
  };
}

export function getSectionBaseCost(section: RecipeSection, ingredients: Ingredient[]): number {
  const normalized = normalizeSection(section);

  const total = normalized.items.reduce((sum, item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    const itemCost = getRecipeItemCost(item, ingredient);
    return sum + (Number.isFinite(itemCost) ? itemCost : 0);
  }, 0);

  return Number.isFinite(total) ? total : 0;
}

export function getSectionEffectiveCost(section: RecipeSection, ingredients: Ingredient[]): number {
  const baseCost = getSectionBaseCost(section, ingredients);
  return Number.isFinite(baseCost) ? baseCost : 0;
}

function convertResultToBaseValue(result: RecipeResult): number {
  if (!Number.isFinite(result.value) || result.value <= 0) {
    return 0;
  }
  if (result.type === "weight") {
    return result.unit === "kg" ? result.value * 1000 : result.value;
  }
  return result.value;
}

export function getRecipeCosts(
  recipe: Recipe,
  ingredients: Ingredient[]
): { recipeTotalCost: number; costPerResultUnit: number; resultUnitLabel: string } {
  const total = recipe.sections.reduce((sum, section) => {
    const sectionCost = getSectionEffectiveCost(section, ingredients);
    return sum + (Number.isFinite(sectionCost) ? sectionCost : 0);
  }, 0);
  const safeTotal = Number.isFinite(total) ? total : 0;
  const resultBaseValue = convertResultToBaseValue(recipe.result);
  const costPerResultUnit = resultBaseValue > 0 ? safeTotal / resultBaseValue : 0;

  return {
    recipeTotalCost: safeTotal,
    costPerResultUnit: Number.isFinite(costPerResultUnit) ? costPerResultUnit : 0,
    resultUnitLabel: recipe.result.type === "weight" ? "г" : "шт",
  };
}

export interface ParsedPdfIngredientRow {
  raw: string;
  name: string;
  amount: number;
  unit: BaseUnit;
}

const unitPattern = "(?:г|гр|грамм(?:а|ов)?|мл|шт|штука|штуки|штук)";
const lineRegex = new RegExp(
  `^\\s*([\\p{L}\\d\\s().,%-]+?)\\s*(?:[-:])?\\s*(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})\\s*$`,
  "iu"
);

function normalizeUnit(unitRaw: string): BaseUnit | null {
  const normalized = unitRaw.toLowerCase();
  if (["г", "гр", "грамм", "грамма", "граммов"].includes(normalized)) {
    return "g";
  }
  if (normalized === "мл") {
    return "ml";
  }
  if (["шт", "штука", "штуки", "штук"].includes(normalized)) {
    return "pcs";
  }
  return null;
}

export function parseRecipeFromText(text: string): ParsedPdfIngredientRow[] {
  const rows: ParsedPdfIngredientRow[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const match = line.match(lineRegex);
    if (!match) {
      return;
    }
    const [, nameRaw, amountRaw, unitRaw] = match;
    const unit = normalizeUnit(unitRaw);
    if (!unit) {
      return;
    }
    const amount = Number(amountRaw.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    rows.push({
      raw: line,
      name: nameRaw.trim().replace(/\s{2,}/g, " "),
      amount,
      unit,
    });
  });

  return rows;
}

export function detectRecipeName(text: string): string {
  const candidate = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 4 && !/\d/.test(line));

  return candidate ?? "Рецепт из PDF";
}

const MULTI_SPACE_PATTERN = /\s{2,}/g;
const LETTERS_AND_SPACES_PATTERN = /^[\p{L}\s-]+$/u;

export function formatProductTypeLabel(value: string): string {
  if (!LETTERS_AND_SPACES_PATTERN.test(value)) {
    return value;
  }
  const lowered = value.toLocaleLowerCase("ru-RU");
  return lowered.charAt(0).toLocaleUpperCase("ru-RU") + lowered.slice(1);
}

export function normalizeProductType(value?: string): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(MULTI_SPACE_PATTERN, " ");
  return normalized.length > 0 ? normalized : null;
}

export function getProductTypeKey(value?: string): string | null {
  const normalized = normalizeProductType(value);
  return normalized ? normalized.toLocaleLowerCase("ru-RU") : null;
}

export function getProductTypesFromRecipes(recipes: Recipe[]): ProductTypeOption[] {
  const byKey = new Map<string, ProductTypeOption>();

  recipes.forEach((recipe) => {
    const normalized = normalizeProductType(recipe.category);
    if (!normalized) {
      return;
    }
    const key = getProductTypeKey(normalized);
    if (!key) {
      return;
    }
    if (!byKey.has(key)) {
      byKey.set(key, {
        value: normalized,
        label: formatProductTypeLabel(normalized),
      });
    }
  });

  return Array.from(byKey.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "ru-RU", { sensitivity: "base" })
  );
}
