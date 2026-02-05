import Dexie, { type Table } from "dexie";
import type { Customer, Ingredient, Order, Recipe, Settings } from "./types";

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
            const baseUnit = ["g", "ml", "pcs"].includes(rawBaseUnit)
              ? rawBaseUnit
              : rawUnit === "мл" || rawUnit === "ml"
                ? "ml"
                : rawUnit === "шт" || rawUnit === "pcs"
                  ? "pcs"
                  : "g";

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
                const unit = ["g", "ml", "pcs"].includes(unitRaw) ? unitRaw : "g";
                if (!ingredientId || amount <= 0) {
                  return null;
                }
                return { ingredientId, amount, unit };
              })
              .filter(Boolean);

            const rawYieldUnit = typeof raw.yieldUnit === "string" ? raw.yieldUnit : "";
            const yieldUnit = ["g", "ml", "pcs"].includes(rawYieldUnit) ? rawYieldUnit : "g";

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
              createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
              updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
            });
          }),
        ]);
      });
  }
}

export const db = new ConfectionerDB();
