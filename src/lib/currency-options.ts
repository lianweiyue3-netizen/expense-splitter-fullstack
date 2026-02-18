export type CurrencyOption = {
  code: string;
  label: string;
};

const symbolOverrides: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  AUD: '$',
  CAD: '$',
  NZD: '$',
  HKD: '$',
  SGD: '$',
  BRL: 'R$',
  INR: '₹',
  KRW: '₩',
  THB: '฿',
  TRY: '₺',
  RUB: '₽',
  VND: '₫',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  IDR: 'Rp',
  MYR: 'RM',
  ILS: '₪',
  PHP: '₱',
  ZAR: 'R',
  NGN: '₦',
  UAH: '₴',
  AED: 'د.إ',
  SAR: '﷼'
};

export function getInitialCurrencyOptions(code: string): CurrencyOption[] {
  const normalized = code.toUpperCase();
  return [{ code: normalized, label: `${normalized} (${normalized})` }];
}

export function getClientCurrencyOptions(
  selectedCode?: string
): CurrencyOption[] {
  const getSymbol = (code: string): string => {
    if (symbolOverrides[code]) {
      return symbolOverrides[code];
    }
    try {
      const formatted = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol'
      }).format(1);
      return formatted.replace(/[0-9.,\s]/g, '') || code;
    } catch {
      return code;
    }
  };

  let codes: string[] = [];
  if (typeof Intl.supportedValuesOf === 'function') {
    codes = Intl.supportedValuesOf('currency');
  } else {
    codes = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'SGD', 'HKD'];
  }

  const normalizedSelected = selectedCode?.toUpperCase();
  if (normalizedSelected && !codes.includes(normalizedSelected)) {
    codes = [normalizedSelected, ...codes];
  }

  return codes
    .map((code) => ({
      code,
      label: `${code} (${getSymbol(code)})`
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
