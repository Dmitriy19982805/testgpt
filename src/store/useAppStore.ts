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
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
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
    const [customers, orders, ingredients, recipes, settings] =
      await Promise.all([
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
    const customersToUpdate = migratedCustomers.filter(
      (customer, index) => customer !== customers[index]
    );
    if (customersToUpdate.length > 0) {
      await db.customers.bulkPut(customersToUpdate);
    }
    let resolvedSettings = settings ?? defaultSettings;
    if (!settings) {
      await db.settings.put(defaultSettings);
    } else {
      const needsCurrencyMigration =
        !settings.currencyMigrated && (!settings.currency || settings.currency === "USD");
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
    const customerId = createId("cust");
    const demo = t.demo;
    const customer: Customer = {
      id: customerId,
      name: demo.customerName,
      phone: "+1 (555) 302-1988",
      secondaryContact: "@ekaterina",
      notes: demo.customerNotes,
      tags: demo.customerTags,
      createdAt: now.toISOString(),
    };
    const customers: Customer[] = [customer];
    const ingredients: Ingredient[] = [
      { id: createId("ing"), name: demo.ingredients.vanilla, unit: "кг", pricePerUnit: 3.5 },
      { id: createId("ing"), name: demo.ingredients.butter, unit: "кг", pricePerUnit: 4.2 },
      { id: createId("ing"), name: demo.ingredients.flour, unit: "кг", pricePerUnit: 1.1 },
    ];
    const recipes: Recipe[] = [
      {
        id: createId("rec"),
        name: demo.recipeName,
        yieldKg: 4,
        ingredients: ingredients.map((item) => ({
          ingredientId: item.id,
          qty: 0.4,
        })),
        notes: demo.recipeNotes,
      },
    ];
    const orders: Order[] = [
      {
        id: createId("ord"),
        orderNo: createOrderNumber(0),
        status: "confirmed",
        createdAt: now.toISOString(),
        dueAt: toDueAtIso(
          new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2).toISOString(),
          DEFAULT_DUE_TIME
        ),
        dueTime: DEFAULT_DUE_TIME,
        customerId,
        customerName: customer.name,
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
        inscriptionText: demo.inscriptionText,
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
            at: now.toISOString(),
            method: "card",
            note: demo.paymentNote,
          },
        ],
        cost: {
          ingredientsCost: 60,
          packagingCost: 18,
          laborCost: 120,
          totalCost: 198,
        },
        profit: {
          grossProfit: 237,
          marginPct: 54.5,
        },
        checklist: [
          { id: createId("check"), text: demo.checklist[0], done: true },
          { id: createId("check"), text: demo.checklist[1], done: false },
        ],
        timeline: [
          { id: createId("time"), at: now.toISOString(), text: demo.timelineConfirmed },
        ],
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
  deleteRecipe: async (id) => {
    await db.recipes.delete(id);
    await get().loadAll();
  },
  deleteIngredient: async (id) => {
    await db.ingredients.delete(id);
    await get().loadAll();
  },
}));
