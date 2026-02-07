import Dexie, { type Table } from "dexie";
import { toBaseUnit, type Customer, type Ingredient, type Order, type Recipe, type RecipeSection, type Settings } from "./types";

export class ConfectionerDB extends Dexie {
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  ingredients!: Table<Ingredient, string>;
  recipes!: Table<Recipe, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("confectionerCabinet");
    this.version(1).stores({
      customers: "id, name, createdAt",
      orders: "id, orderNo, status, createdAt, dueAt, customerId",
      ingredients: "id, name",
      recipes: "id, name",
      settings: "id",
    });

    this.version(2)
      .stores({
        customers: "id, name, createdAt",
        orders: "id, orderNo, status, createdAt, dueAt, customerId",
        ingredients: "id, name, category, baseUnit, updatedAt",
        recipes: "id, name, category, updatedAt",
        settings: "id",
      })
      .upgrade(async (tx) => {
        const ingredients = (await tx.table("ingredients").toArray()) as Array<Record<string, unknown>>;
        const recipes = (await tx.table("recipes").toArray()) as Array<Record<string, unknown>>;
        const now = new Date().toISOString();

        await Promise.all([
          ...ingredients.map((raw) => {
            const packSize = typeof raw.packSize === "number" && raw.packSize > 0 ? raw.packSize : 1;
            const packPrice =
              typeof raw.packPrice === "number"
                ? raw.packPrice
                : typeof raw.pricePerUnit === "number"
                  ? raw.pricePerUnit
                  : 0;
            const rawUnit = typeof raw.unit === "string" ? raw.unit : "";
            const rawBaseUnit = typeof raw.baseUnit === "string" ? raw.baseUnit : "";
            const baseUnit =
              toBaseUnit(rawBaseUnit) ??
              (rawUnit === "мл" || rawUnit === "ml"
                ? "ml"
                : rawUnit === "шт" || rawUnit === "pcs"
                  ? "pcs"
                  : "g");

            return tx.table("ingredients").put({
              id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
              name: typeof raw.name === "string" ? raw.name : "",
              category: typeof raw.category === "string" ? raw.category : "",
              baseUnit,
              packSize,
              packPrice,
              lossPct: typeof raw.lossPct === "number" ? raw.lossPct : 0,
              createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
              updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
            });
          }),
          ...recipes.map((raw) => {
            const itemsRaw = Array.isArray(raw.items)
              ? raw.items
              : Array.isArray(raw.ingredients)
                ? raw.ingredients
                : [];
            const items = itemsRaw
              .map((entry) => {
                if (!entry || typeof entry !== "object") {
                  return null;
                }
                const item = entry as Record<string, unknown>;
                const ingredientId = typeof item.ingredientId === "string" ? item.ingredientId : "";
                const amount = typeof item.amount === "number" ? item.amount : typeof item.qty === "number" ? item.qty : 0;
                const unitRaw = typeof item.unit === "string" ? item.unit : "g";
                const unit = toBaseUnit(unitRaw) ?? "g";
                if (!ingredientId || amount <= 0) {
                  return null;
                }
                const rowCost = typeof item.rowCost === "number" ? item.rowCost : undefined;
                return { ingredientId, amount, unit, rowCost };
              })
              .filter(Boolean);

            const rawYieldUnit = typeof raw.yieldUnit === "string" ? raw.yieldUnit : "";
            const yieldUnit = toBaseUnit(rawYieldUnit) ?? "g";

            return tx.table("recipes").put({
              id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
              name: typeof raw.name === "string" ? raw.name : "",
              category: typeof raw.category === "string" ? raw.category : "",
              yieldAmount:
                typeof raw.yieldAmount === "number"
                  ? raw.yieldAmount
                  : typeof raw.yieldKg === "number"
                    ? raw.yieldKg * 1000
                    : 1,
              yieldUnit,
              items,
              notes: typeof raw.notes === "string" ? raw.notes : "",
              fileName: typeof raw.fileName === "string" ? raw.fileName : "",
              fileUrl: typeof raw.fileUrl === "string" ? raw.fileUrl : "",
              createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
              updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
            });
          }),
        ]);
      });

    this.version(3)
      .stores({
        customers: "id, name, createdAt",
        orders: "id, orderNo, status, createdAt, dueAt, customerId",
        ingredients: "id, name, category, baseUnit, updatedAt",
        recipes: "id, name, category, updatedAt",
        settings: "id",
      })
      .upgrade(async (tx) => {
        const recipes = (await tx.table("recipes").toArray()) as Array<Record<string, unknown>>;
        const now = new Date().toISOString();

        await Promise.all(
          recipes.map((raw) => {
            const existingSections = Array.isArray(raw.sections) ? raw.sections : [];
            const legacyItems = Array.isArray(raw.items) ? raw.items : [];

            const toItem = (entry: unknown) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const item = entry as Record<string, unknown>;
              const ingredientId = typeof item.ingredientId === "string" ? item.ingredientId : "";
              const amount = typeof item.amount === "number" ? item.amount : 0;
              const unitRaw = typeof item.unit === "string" ? item.unit : "g";
              const unit = toBaseUnit(unitRaw) ?? "g";
              if (!ingredientId || amount <= 0) {
                return null;
              }
              return {
                ingredientId,
                amount,
                unit,
                rowCost: typeof item.rowCost === "number" ? item.rowCost : undefined,
              };
            };

            const normalizeSection = (entry: unknown): RecipeSection | null => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const section = entry as Record<string, unknown>;
              const id = typeof section.id === "string" && section.id ? section.id : crypto.randomUUID();
              const name = typeof section.name === "string" ? section.name.trim() : "";
              const items = Array.isArray(section.items) ? section.items.map(toItem).filter(Boolean) : [];
              if (!name) {
                return null;
              }
              const outputUnitRaw = typeof section.outputUnit === "string" ? section.outputUnit : undefined;
              const outputUnit = toBaseUnit(outputUnitRaw);

              return {
                id,
                name,
                notes: typeof section.notes === "string" ? section.notes : "",
                outputAmount: typeof section.outputAmount === "number" && section.outputAmount > 0 ? section.outputAmount : undefined,
                outputUnit,
                usageAmount: typeof section.usageAmount === "number" && section.usageAmount > 0 ? section.usageAmount : undefined,
                linkedRecipeId: typeof section.linkedRecipeId === "string" && section.linkedRecipeId ? section.linkedRecipeId : undefined,
                items: items as RecipeSection["items"],
              };
            };

            const normalizedSections = existingSections.map(normalizeSection).filter(Boolean) as RecipeSection[];
            const fallbackItems = legacyItems.map(toItem).filter(Boolean);

            const sections =
              normalizedSections.length > 0
                ? normalizedSections
                : [
                    {
                      id: crypto.randomUUID(),
                      name: "Основной состав",
                      notes: "",
                      outputAmount: typeof raw.yieldAmount === "number" && raw.yieldAmount > 0 ? raw.yieldAmount : undefined,
                      outputUnit: typeof raw.yieldUnit === "string" ? toBaseUnit(raw.yieldUnit) : undefined,
                      usageAmount: undefined,
                      items: fallbackItems as RecipeSection["items"],
                    },
                  ];

            return tx.table("recipes").put({
              id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
              name: typeof raw.name === "string" ? raw.name : "",
              category: typeof raw.category === "string" ? raw.category : "",
              sections,
              notes: typeof raw.notes === "string" ? raw.notes : "",
              fileName: typeof raw.fileName === "string" ? raw.fileName : "",
              fileUrl: typeof raw.fileUrl === "string" ? raw.fileUrl : "",
              createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
              updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
            });
          })
        );
      });
  }
}

export const db = new ConfectionerDB();
