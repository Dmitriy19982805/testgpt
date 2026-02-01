export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createOrderNumber(count: number) {
  const padded = String(count + 1).padStart(4, "0");
  return `ORD-${padded}`;
}
