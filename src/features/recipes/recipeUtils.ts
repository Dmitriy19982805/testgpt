import type { BaseUnit, Ingredient, Recipe, RecipeItem } from "../../db/types";

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

export function getRecipeCosts(recipe: Recipe, ingredients: Ingredient[]) {
  const total = recipe.items.reduce((sum, item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    return sum + getRecipeItemCost(item, ingredient);
  }, 0);
  return {
    recipeTotalCost: total,
    costPerYieldUnit: recipe.yieldAmount > 0 ? total / recipe.yieldAmount : 0,
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
