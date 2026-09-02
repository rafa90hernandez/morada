export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatBrazilianDateInput(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function brazilianDateToIso(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${yyyy}-${mm}-${dd}`;
}

export function isoToBrazilianDate(value?: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function formatBrazilianCurrencyInput(value: string) {
  const digits = digitsOnly(value).replace(/^0+(?=\d)/, "");
  if (!digits) return "";

  const whole = Number(digits);
  if (!Number.isSafeInteger(whole)) return "";

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(whole)},00`;
}

export function brazilianCurrencyToCents(
  value: string,
): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const wholeDigits = normalized
    .replace(/,\d{0,2}$/, "")
    .replace(/\D/g, "");
  if (!wholeDigits) return undefined;

  const whole = Number(wholeDigits);
  return Number.isSafeInteger(whole) ? whole * 100 : undefined;
}

export function centsToBrazilianCurrency(value?: number | null) {
  if (value === undefined || value === null) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
