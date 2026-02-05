const localeByCurrency: Record<string, string> = {
  RUB: "ru-RU",
  USD: "en-US",
  EUR: "de-DE",
};

interface CurrencyFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatCurrency(amount: number, currency = "USD", options: CurrencyFormatOptions = {}) {
  const locale = localeByCurrency[currency] ?? "en-US";
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function formatUnitCurrency(amount: number, currency = "RUB") {
  const absAmount = Math.abs(amount);
  const minimumFractionDigits = absAmount >= 1 ? 2 : 3;
  const maximumFractionDigits = absAmount >= 1 ? 2 : 3;
  return formatCurrency(amount, currency, { minimumFractionDigits, maximumFractionDigits });
}
