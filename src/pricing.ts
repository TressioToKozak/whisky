export type PriceQuote = {
  amount: number;
  referenceOnly?: boolean;
  currency: 'EUR';
  market: 'NL' | 'auction' | 'international';
  kind: 'retail' | 'auction-result' | 'auction-estimate' | 'user-report';
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  volumeMl: number | null;
  originalAmount: number;
  originalCurrency: 'EUR' | 'GBP' | 'USD';
  exchangeRate?: number;
  exchangeRateSource?: string;
  soldAt?: string;
  feesIncluded: boolean | null;
  note: string;
}
export const euro = (amount: number) => new Intl.NumberFormat('nl-NL', {style:'currency',currency:'EUR',maximumFractionDigits:0}).format(amount)
export const priceLabel = (quote?: PriceQuote) => quote ? quote.referenceOnly ? `ref. ${euro(quote.amount)}${quote.volumeMl ? ` · ${quote.volumeMl} ml` : ''}` : `ok. ${euro(quote.amount)}` : 'Brak wyceny'
export const marketLabel = (quote: PriceQuote) => quote.kind === 'user-report' ? 'Zgłoszona cena' : quote.market === 'NL' ? 'Sklep w NL' : quote.market === 'auction' ? (quote.kind === 'auction-result' ? 'Wynik aukcji' : 'Szacunek aukcyjny') : 'Sklep poza NL'
export function comparePrices(a: PriceQuote | undefined, b: PriceQuote | undefined, descending = false) {
  // Unpriced custom bottles stay last in both directions.
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return descending ? b.amount-a.amount : a.amount-b.amount
}

export function cellarValue(bottles: { whiskyId: string; quantity: number }[], quotes: Record<string, PriceQuote>) {
  // Sum in cents; missing personal entries are explicitly counted, never valued at zero.
  let cents = 0, missing = 0
  for (const bottle of bottles) {
    const quote = quotes[bottle.whiskyId]
    if (quote && !quote.referenceOnly) cents += Math.round(quote.amount * 100) * bottle.quantity
    else missing += bottle.quantity
  }
  return { amount: cents / 100, missing }
}

/** Each wishlist position represents one bottle, independent of current list filters. */
export function wishlistValue(ids: string[], quotes: Record<string, PriceQuote>) {
  return cellarValue(ids.map(whiskyId => ({ whiskyId, quantity: 1 })), quotes)
}
