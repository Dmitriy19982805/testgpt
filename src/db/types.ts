export type PickupOrDelivery = "pickup" | "delivery";
export type BaseUnit = "g" | "ml" | "pcs";

export const BASE_UNITS: BaseUnit[] = ["g", "ml", "pcs"];

export function toBaseUnit(value?: string): BaseUnit | undefined {
  if (!value) {
    return undefined;
  }
  return BASE_UNITS.find((unit) => unit === value);
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  secondaryContact?: string;
  email?: string;
  notes: string;
  tags: string[];
  createdAt: string;
}

export interface OrderItem {
  type: string;
  name: string;
  weightKg: number;
  qty: number;
  options: string[];
}

export interface OrderReference {
  id: string;
  name: string;
  urlOrData: string;
}

export interface OrderPayment {
  id: string;
  type: string;
  amount: number;
  at: string;
  method: string;
  note?: string;
}

export interface OrderChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface OrderTimelineItem {
  id: string;
  at: string;
  text: string;
}

export interface OrderPrice {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
}

export interface OrderCost {
  ingredientsCost: number;
  packagingCost: number;
  laborCost: number;
  totalCost: number;
}

export interface OrderProfit {
  grossProfit: number;
  marginPct: number;
}

export interface Order {
  id: string;
  orderNo: string;
  status: "draft" | "confirmed" | "in-progress" | "ready" | "completed" | "cancelled";
  createdAt: string;
  dueAt: string;
  dueTime?: string;
  customerId: string;
  customerName: string;
  dessertType?: string;
  recipeId?: string;
  flavor?: string;
  size?: string;
  inscriptionText?: string;
  decorationNotes?: string;
  items: OrderItem[];
  designNotes: string;
  allergens: string;
  references: OrderReference[];
  pickupOrDelivery: PickupOrDelivery;
  address: string;
  deliveryFee: number;
  price: OrderPrice;
  payments: OrderPayment[];
  cost: OrderCost;
  profit: OrderProfit;
  checklist: OrderChecklistItem[];
  timeline: OrderTimelineItem[];
}

export interface Ingredient {
  id: string;
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  packSize: number;
  packPrice: number;
  lossPct?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeItem {
  ingredientId: string;
  amount: number;
  unit: BaseUnit;
  rowCost?: number;
}

export interface RecipeSection {
  id: string;
  name: string;
  notes?: string;
  outputAmount?: number;
  outputUnit?: BaseUnit;
  usageAmount?: number;
  items: RecipeItem[];
}

export interface Recipe {
  id: string;
  name: string;
  category?: string;
  sections: RecipeSection[];
  notes?: string;
  fileName?: string;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  businessName: string;
  currency: string;
  currencyMigrated?: boolean;
  dayCapacityRules: number;
  theme: "light" | "dark";
  pin: string;
}
