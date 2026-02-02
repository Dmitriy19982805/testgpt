export type PickupOrDelivery = "pickup" | "delivery";

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
  customerId: string;
  customerName: string;
  items: OrderItem[];
  designNotes: string;
  inscriptionText: string;
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
  unit: string;
  pricePerUnit: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  yieldKg: number;
  ingredients: RecipeIngredient[];
  notes: string;
}

export interface Settings {
  id: string;
  businessName: string;
  currency: string;
  currencyMigrated?: boolean;
  dayCapacityRules: number;
  defaultDepositPct: number;
  theme: "light" | "dark";
  pin: string;
}
