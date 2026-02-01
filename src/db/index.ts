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
  }
}

export const db = new ConfectionerDB();
