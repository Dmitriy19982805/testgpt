import { create } from "zustand";
import { db } from "../db";
import type { Customer, Ingredient, Order, Recipe, Settings } from "../db/types";
import { createId, createOrderNumber } from "../utils/ids";
import { t } from "../i18n";
import { DEFAULT_DUE_TIME, toDueAtIso } from "../utils/date";

interface AppState {
  customers: Customer[];
  orders: Order[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  settings: Settings | null;
  isLoaded: boolean;
  loadAll: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  seedDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
  addCustomer: (
    customer: Omit<Customer, "id" | "createdAt"> & Partial<Pick<Customer, "id" | "createdAt">>
  ) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<Customer>;
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addIngredient: (ingredient: Omit<Ingredient, "id" | "createdAt" | "updatedAt">) => Promise<Ingredient>;
  updateIngredient: (ingredient: Ingredient) => Promise<Ingredient>;
  deleteIngredient: (id: string) => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, "id" | "createdAt" | "updatedAt">) => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
}

const defaultSettings: Settings = {
  id: "settings",
  businessName: t.appName,
  currency: "RUB",
  currencyMigrated: true,
  dayCapacityRules: 5,
  theme: "light",
  pin: "1234",
};

export const useAppStore = create<AppState>((set, get) => ({
  customers: [],
  orders: [],
  ingredients: [],
  recipes: [],
  settings: null,
  isLoaded: false,
  loadAll: async () => {
    const [customers, orders, ingredients, recipes, settings] = await Promise.all([
      db.customers.toArray(),
      db.orders.toArray(),
      db.ingredients.toArray(),
      db.recipes.toArray(),
      db.settings.get("settings"),
    ]);
    const migratedCustomers = customers.map((customer) => {
      if (!customer.secondaryContact && customer.email) {
        return { ...customer, secondaryContact: customer.email };
      }
      return customer;
    });
    const customersToUpdate = migratedCustomers.filter((customer, index) => customer !== customers[index]);
    if (customersToUpdate.length > 0) {
      await db.customers.bulkPut(customersToUpdate);
    }

    let resolvedSettings = settings ?? defaultSettings;
    if (!settings) {
      await db.settings.put(defaultSettings);
    } else {
      const needsCurrencyMigration = !settings.currencyMigrated && (!settings.currency || settings.currency === "USD");
      if (needsCurrencyMigration) {
        resolvedSettings = {
          ...settings,
          currency: "RUB",
          currencyMigrated: true,
        };
        await db.settings.put(resolvedSettings);
      } else if (!settings.currencyMigrated) {
        resolvedSettings = { ...settings, currencyMigrated: true };
        await db.settings.put(resolvedSettings);
      }
    }

    set({
      customers: migratedCustomers,
      orders,
      ingredients,
      recipes,
      settings: resolvedSettings,
      isLoaded: true,
    });
  },
  saveSettings: async (settings) => {
    await db.settings.put(settings);
    set({ settings });
  },
  seedDemo: async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const customerId = createId("cust");
    const demo = t.demo;
    const customer: Customer = {
      id: customerId,
      name: demo.customerName,
      phone: "+1 (555) 302-1988",
      secondaryContact: "@ekaterina",
      notes: demo.customerNotes,
      tags: demo.customerTags,
      createdAt: nowIso,
    };
    const customers: Customer[] = [customer];
    const ingredients: Ingredient[] = [
      {
        id: createId("ing"),
        name: demo.ingredients.vanilla,
        category: "База",
        baseUnit: "g",
        packSize: 1000,
        packPrice: 350,
        lossPct: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: createId("ing"),
        name: demo.ingredients.butter,
        category: "Молочные",
        baseUnit: "g",
        packSize: 1000,
        packPrice: 420,
        lossPct: 3,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: createId("ing"),
        name: demo.ingredients.flour,
        category: "Сухие",
        baseUnit: "g",
        packSize: 1000,
        packPrice: 110,
        lossPct: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    const recipes: Recipe[] = [
      {
        id: createId("rec"),
        name: demo.recipeName,
        category: "Бисквит",
        sections: [
          {
            id: createId("sec"),
            name: "Базовый бисквит",
            notes: "",
            outputAmount: 1500,
            outputUnit: "g",
            usageAmount: 1500,
            items: ingredients.map((item) => ({ ingredientId: item.id, amount: 400, unit: "g" })),
          },
        ],
        notes: demo.recipeNotes,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    const orders: Order[] = [
      {
        id: createId("ord"),
        orderNo: createOrderNumber(0),
        status: "confirmed",
        createdAt: nowIso,
        dueAt: toDueAtIso(new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2).toISOString(), DEFAULT_DUE_TIME),
        dueTime: DEFAULT_DUE_TIME,
        customerId,
        customerName: customer.name,
        dessertType: demo.orderItemType,
        recipeId: recipes[0]?.id,
        flavor: "Ваниль",
        size: "2 яруса",
        inscriptionText: demo.inscriptionText,
        decorationNotes: "Жемчужная посыпка и живые цветы.",
        items: [
          {
            type: demo.orderItemType,
            name: demo.orderItemName,
            weightKg: 6,
            qty: 1,
            options: demo.orderItemOptions,
          },
        ],
        designNotes: demo.designNotes,
        allergens: demo.allergens,
        references: [],
        pickupOrDelivery: "delivery",
        address: demo.address,
        deliveryFee: 35,
        price: { subtotal: 420, discount: 20, delivery: 35, total: 435 },
        payments: [
          {
            id: createId("pay"),
            type: "deposit",
            amount: 150,
            at: nowIso,
            method: "card",
            note: demo.paymentNote,
          },
        ],
        cost: { ingredientsCost: 60, packagingCost: 18, laborCost: 120, totalCost: 198 },
        profit: { grossProfit: 237, marginPct: 54.5 },
        checklist: [
          { id: createId("check"), text: demo.checklist[0], done: true },
          { id: createId("check"), text: demo.checklist[1], done: false },
        ],
        timeline: [{ id: createId("time"), at: nowIso, text: demo.timelineConfirmed }],
      },
    ];

    await db.transaction("rw", db.customers, db.orders, db.ingredients, db.recipes, async () => {
      await db.customers.clear();
      await db.orders.clear();
      await db.ingredients.clear();
      await db.recipes.clear();
      await db.customers.bulkAdd(customers);
      await db.orders.bulkAdd(orders);
      await db.ingredients.bulkAdd(ingredients);
      await db.recipes.bulkAdd(recipes);
    });

    set({ customers, orders, ingredients, recipes });
  },
  clearAll: async () => {
    await db.transaction("rw", db.customers, db.orders, db.ingredients, db.recipes, async () => {
      await db.customers.clear();
      await db.orders.clear();
      await db.ingredients.clear();
      await db.recipes.clear();
    });
    set({ customers: [], orders: [], ingredients: [], recipes: [] });
  },
  addCustomer: async (customerInput) => {
    const now = new Date().toISOString();
    const customer: Customer = {
      id: customerInput.id ?? createId("cust"),
      name: customerInput.name.trim(),
      phone: customerInput.phone.trim(),
      secondaryContact: customerInput.secondaryContact?.trim() ?? "",
      notes: customerInput.notes ?? "",
      tags: customerInput.tags ?? [],
      createdAt: customerInput.createdAt ?? now,
    };
    await db.customers.put(customer);
    set({ customers: [...get().customers, customer] });
    return customer;
  },
  updateCustomer: async (customer) => {
    await db.customers.put(customer);
    set({ customers: get().customers.map((item) => (item.id === customer.id ? customer : item)) });
    return customer;
  },
  addOrder: async (order) => {
    await db.orders.put(order);
    set({ orders: [...get().orders, order] });
  },
  updateOrder: async (order) => {
    await db.orders.put(order);
    await get().loadAll();
  },
  deleteOrder: async (id) => {
    await db.orders.delete(id);
    await get().loadAll();
  },
  deleteCustomer: async (id) => {
    await db.customers.delete(id);
    await get().loadAll();
  },
  addIngredient: async (ingredientInput) => {
    const now = new Date().toISOString();
    const ingredient: Ingredient = {
      id: createId("ing"),
      ...ingredientInput,
      name: ingredientInput.name.trim(),
      category: ingredientInput.category?.trim() ?? "",
      lossPct: ingredientInput.lossPct ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.ingredients.put(ingredient);
    set({ ingredients: [...get().ingredients, ingredient] });
    return ingredient;
  },
  updateIngredient: async (ingredient) => {
    const nextIngredient: Ingredient = {
      ...ingredient,
      name: ingredient.name.trim(),
      category: ingredient.category?.trim() ?? "",
      lossPct: ingredient.lossPct ?? 0,
      updatedAt: new Date().toISOString(),
    };
    await db.ingredients.put(nextIngredient);
    set({ ingredients: get().ingredients.map((item) => (item.id === nextIngredient.id ? nextIngredient : item)) });
    return nextIngredient;
  },
  deleteIngredient: async (id) => {
    await db.ingredients.delete(id);
    await get().loadAll();
  },
  addRecipe: async (recipeInput) => {
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: createId("rec"),
      ...recipeInput,
      name: recipeInput.name.trim(),
      category: recipeInput.category?.trim() ?? "",
      notes: recipeInput.notes?.trim() ?? "",
      fileName: recipeInput.fileName?.trim() ?? "",
      fileUrl: recipeInput.fileUrl ?? "",
      createdAt: now,
      updatedAt: now,
    };
    await db.recipes.put(recipe);
    set({ recipes: [...get().recipes, recipe] });
    return recipe;
  },
  updateRecipe: async (recipe) => {
    const nextRecipe: Recipe = {
      ...recipe,
      name: recipe.name.trim(),
      category: recipe.category?.trim() ?? "",
      notes: recipe.notes?.trim() ?? "",
      fileName: recipe.fileName?.trim() ?? "",
      fileUrl: recipe.fileUrl ?? "",
      updatedAt: new Date().toISOString(),
    };
    await db.recipes.put(nextRecipe);
    set({ recipes: get().recipes.map((item) => (item.id === nextRecipe.id ? nextRecipe : item)) });
    return nextRecipe;
  },
  deleteRecipe: async (id) => {
    await db.recipes.delete(id);
    await get().loadAll();
  },
}));
