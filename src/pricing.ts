import { getPreferences } from './preferences.ts'
import { locale, t } from './i18n.ts'
import exchangeRate from './exchange-rate-pln.json' with { type: 'json' }
export type PriceQuote = {
  amount: number;
  referenceOnly?: boolean;
  currency: 'EUR' | 'PLN';
  convertedFromEUR?: number;
  conversionRate?: number;
  conversionDate?: string;
  conversionSource?: string;
  market: 'PL' | 'NL' | 'auction' | 'international';
  kind: 'retail' | 'auction-result' | 'auction-estimate' | 'user-report';
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  volumeMl: number | null;
  originalAmount: number;
  originalCurrency: 'EUR' | 'GBP' | 'USD' | 'PLN';
  exchangeRate?: number;
  exchangeRateSource?: string;
  soldAt?: string;
  feesIncluded: boolean | null;
  note: string;
}
export const money = (amount: number, currency: 'EUR' | 'PLN') => new Intl.NumberFormat(locale(), {style:'currency',currency,maximumFractionDigits:0}).format(amount)
export const regionalMoney = (amount: number) => money(amount, getPreferences().region === 'PL' ? 'PLN' : 'EUR')
export const priceLabel = (quote?: PriceQuote) => quote ? quote.referenceOnly ? `ref. ${money(quote.amount, quote.currency ?? 'EUR')}${quote.volumeMl ? ` · ${quote.volumeMl} ml` : ''}` : `${t('ok.')} ${money(quote.amount, quote.currency ?? 'EUR')}` : t('Brak wyceny')
export const marketLabel = (quote: PriceQuote) => t(quote.kind === 'user-report' ? 'Zgłoszona cena' : quote.market === 'PL' ? 'Sklep w PL' : quote.market === 'NL' ? 'Sklep w NL' : quote.market === 'auction' ? (quote.kind === 'auction-result' ? 'Wynik aukcji' : 'Szacunek aukcyjny') : 'Sklep poza NL')

/** Convert reference amounts, retaining their original market, date and provenance. */
export function regionalPrices(quotes: Record<string, PriceQuote>, region: 'NL' | 'PL'): Record<string, PriceQuote> {
  if (region === 'NL') return quotes
  return Object.fromEntries(Object.entries(quotes).map(([id, quote]) => [id, { ...quote, amount: Math.round((quote.originalCurrency === 'PLN' ? quote.originalAmount : quote.amount * exchangeRate.PLNperEUR) * 100) / 100, currency: 'PLN' as const, ...(quote.originalCurrency === 'PLN' ? {} : { convertedFromEUR: quote.amount, conversionRate: exchangeRate.PLNperEUR, conversionDate: exchangeRate.date, conversionSource: exchangeRate.source }) }]))
}

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

/** Source notes remain verbatim in the data; the English summary keeps the same pricing limits. */
export function priceNote(quote: PriceQuote): string {
  if (getPreferences().language !== 'en') return quote.note
  if (quote.kind === 'user-report') return 'User-reported purchase price, not independently verified. It may reflect a promotion and is not a current retail offer.'
  if (quote.market === 'auction') {
    const median = quote.note.match(/Mediana (\d+)/)
    return `${median ? `Median of ${median[1]} recorded sales` : quote.kind === 'auction-result' ? 'Recorded auction sale' : 'Auction reference estimate'}${quote.volumeMl ? ` for ${quote.volumeMl} ml` : ''}. ${quote.feesIncluded === false ? 'Buyer fees, delivery and any import charges are excluded.' : 'Check the source for fees and delivery.'} Bottle and packaging condition affect value.${quote.referenceOnly ? ' Matching volume or strength is unconfirmed; this reference is excluded from collection totals.' : ''}`
  }
  return `${quote.market === 'NL' ? 'Dutch retail' : quote.market === 'PL' ? 'Polish retail' : 'Foreign retail'} reference${quote.volumeMl ? ` for ${quote.volumeMl} ml` : ''}, excluding delivery and any import charges. Prices and availability can change. Sold-out editions may show historical prices.`
}
