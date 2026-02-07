import type { BaseUnit, Ingredient, Recipe, RecipeItem, RecipeSection } from "../../db/types";

export const UNIT_OPTIONS: Array<{ label: string; value: BaseUnit }> = [
  { label: "г", value: "g" },
  { label: "мл", value: "ml" },
  { label: "шт", value: "pcs" },
];

export function getUnitLabel(unit: BaseUnit): string {
  return UNIT_OPTIONS.find((item) => item.value === unit)?.label ?? unit;
}

export function getIngredientUnitPrice(ingredient: Ingredient): number {
  if (ingredient.packSize <= 0) {
    return 0;
  }
  const unitPrice = ingredient.packPrice / ingredient.packSize;
  return Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
}

export function getRecipeItemCost(item: RecipeItem, ingredient?: Ingredient): number {
  if (!ingredient || ingredient.packSize <= 0) {
    return 0;
  }
  const unitPrice = getIngredientUnitPrice(ingredient);
  const safeAmount = Number.isFinite(item.amount) && item.amount > 0 ? item.amount : 0;
  const lossFactor = 1 + (ingredient.lossPct ?? 0) / 100;
  const cost = safeAmount * unitPrice * lossFactor;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

function normalizeSection(section: RecipeSection): RecipeSection {
  return {
    ...section,
    items: section.items ?? [],
    outputAmount: typeof section.outputAmount === "number" && section.outputAmount > 0 ? section.outputAmount : undefined,
    usageAmount: typeof section.usageAmount === "number" && section.usageAmount > 0 ? section.usageAmount : undefined,
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
  const hasOutput = typeof section.outputAmount === "number" && section.outputAmount > 0;
  const hasUsage = typeof section.usageAmount === "number" && section.usageAmount > 0;

  if (!hasOutput || !hasUsage) {
    return baseCost;
  }

  const ratio = section.usageAmount! / section.outputAmount!;
  const usageRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(ratio, 1)) : 0;
  const effectiveCost = baseCost * usageRatio;
  return Number.isFinite(effectiveCost) ? effectiveCost : 0;
}

export function getRecipeCosts(recipe: Recipe, ingredients: Ingredient[]): { recipeTotalCost: number; costPerYieldUnit: number } {
  const total = recipe.sections.reduce((sum, section) => {
    const sectionCost = getSectionEffectiveCost(section, ingredients);
    return sum + (Number.isFinite(sectionCost) ? sectionCost : 0);
  }, 0);
  const safeTotal = Number.isFinite(total) ? total : 0;
  const outputSection = recipe.sections.find((section) => typeof section.outputAmount === "number" && section.outputAmount > 0);
  const outputAmount = outputSection?.outputAmount ?? 0;
  const costPerUnit = outputAmount > 0 ? safeTotal / outputAmount : 0;

  return {
    recipeTotalCost: safeTotal,
    costPerYieldUnit: Number.isFinite(costPerUnit) ? costPerUnit : 0,
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
