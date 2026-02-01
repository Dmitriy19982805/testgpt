const localeByCurrency: Record<string, string> = {
  RUB: "ru-RU",
  USD: "en-US",
  EUR: "de-DE",
};

export function formatCurrency(amount: number, currency = "USD") {
  const locale = localeByCurrency[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
