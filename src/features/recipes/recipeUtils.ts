import type { BaseUnit, Ingredient, Recipe, RecipeItem, RecipeSection } from "../../db/types";

export const UNIT_OPTIONS: Array<{ label: string; value: BaseUnit }> = [
  { label: "г", value: "g" },
  { label: "мл", value: "ml" },
  { label: "шт", value: "pcs" },
];

export function getUnitLabel(unit: BaseUnit) {
  return UNIT_OPTIONS.find((item) => item.value === unit)?.label ?? unit;
}

export function getIngredientUnitPrice(ingredient: Ingredient) {
  if (ingredient.packSize <= 0) {
    return 0;
  }
  return ingredient.packPrice / ingredient.packSize;
}

export function getRecipeItemCost(item: RecipeItem, ingredient?: Ingredient) {
  if (!ingredient || ingredient.packSize <= 0) {
    return 0;
  }
  const unitPrice = getIngredientUnitPrice(ingredient);
  const lossFactor = 1 + (ingredient.lossPct ?? 0) / 100;
  return item.amount * unitPrice * lossFactor;
}

function normalizeSection(section: RecipeSection) {
  return {
    ...section,
    items: section.items ?? [],
    outputAmount: typeof section.outputAmount === "number" && section.outputAmount > 0 ? section.outputAmount : undefined,
    usageAmount: typeof section.usageAmount === "number" && section.usageAmount > 0 ? section.usageAmount : undefined,
  };
}

export function getSectionBaseCost(section: RecipeSection, ingredients: Ingredient[], recipes: Recipe[]) {
  const normalized = normalizeSection(section);
  if (normalized.linkedRecipeId) {
    const linkedRecipe = recipes.find((recipe) => recipe.id === normalized.linkedRecipeId);
    if (!linkedRecipe) {
      return 0;
    }
    return getRecipeCosts(linkedRecipe, ingredients, recipes).recipeTotalCost;
  }

  return normalized.items.reduce((sum, item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    return sum + getRecipeItemCost(item, ingredient);
  }, 0);
}

export function getSectionEffectiveCost(section: RecipeSection, ingredients: Ingredient[], recipes: Recipe[]) {
  const baseCost = getSectionBaseCost(section, ingredients, recipes);
  const hasOutput = typeof section.outputAmount === "number" && section.outputAmount > 0;
  const hasUsage = typeof section.usageAmount === "number" && section.usageAmount > 0;

  if (!hasOutput || !hasUsage) {
    return baseCost;
  }

  const usageRatio = Math.min(section.usageAmount! / section.outputAmount!, 1);
  return baseCost * usageRatio;
}

export function getRecipeCosts(recipe: Recipe, ingredients: Ingredient[], recipes: Recipe[]) {
  const total = recipe.sections.reduce((sum, section) => sum + getSectionEffectiveCost(section, ingredients, recipes), 0);
  const outputSection = recipe.sections.find((section) => typeof section.outputAmount === "number" && section.outputAmount > 0);
  const costPerUnit = outputSection?.outputAmount ? total / outputSection.outputAmount : 0;

  return {
    recipeTotalCost: total,
    costPerYieldUnit: costPerUnit,
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

export function detectRecipeName(text: string) {
  const candidate = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 4 && !/\d/.test(line));

  return candidate ?? "Рецепт из PDF";
}
