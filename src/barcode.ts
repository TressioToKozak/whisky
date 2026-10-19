import type { Journal, Whisky } from './model'

export type BarcodeEntry = { code: string; whiskyId: string; volumeMl: number | null; sourceUrl: string; checkedAt: string }
export type BarcodeLink = { code: string; whiskyId: string }

/** Canonical GTIN-14. Leading zeros remain significant; this is never a number. */
export function normalizeBarcode(input: string): string | null {
  const code = input.replace(/[\s-]/g, '')
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || /^(\d)\1+$/.test(code)) return null
  const sum = [...code.slice(0, -1)].reverse().reduce((s, d, i) => s + Number(d) * (i % 2 ? 1 : 3), 0)
  return (10 - sum % 10) % 10 === Number(code.at(-1)) ? code.padStart(14, '0') : null
}

/** UPC-E is a compressed UPC-A, not an EAN-8 despite having eight digits. */
export function expandUpce(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null
  const [system, a, b, c, d, e, last, check] = code
  const middle = '012'.includes(last) ? `${a}${b}${last}0000${c}${d}${e}`
    : last === '3' ? `${a}${b}${c}00000${d}${e}`
    : last === '4' ? `${a}${b}${c}${d}00000${e}` : `${a}${b}${c}${d}${e}0000${last}`
  const expanded = system + middle + check
  return normalizeBarcode(expanded) ? expanded : null
}

export function barcodeMatches(code: string, all: Whisky[], entries: BarcodeEntry[], personal: BarcodeLink[] = []) {
  const normalized = normalizeBarcode(code)
  if (!normalized) return []
  const saved = personal.find(link => link.code === normalized)
  if (saved) return all.filter(w => w.id === saved.whiskyId)
  return all.filter(w => entries.some(entry => entry.code === normalized && entry.whiskyId === w.id && entry.volumeMl === w.volume))
}

/** Only a confirmed scan changes stock; a repeated frame never calls this function. */
export function addBarcodeBottle(journal: Journal, whisky: Whisky, input: string, remember: boolean): Journal {
  const code = normalizeBarcode(input)
  if (!code) throw Error('Nieprawidłowy kod kreskowy.')
  const bottle = journal.bottles.find(b => b.whiskyId === whisky.id)
  if (bottle && bottle.quantity >= 999) throw Error('W barku możesz zapisać maksymalnie 999 butelek tej whisky.')
  const links = journal.barcodeLinks ?? []
  if (remember && !links.some(link => link.code === code) && links.length >= 4000) throw Error('Osiągnięto limit zapisanych dopasowań kodów.')
  return {
    ...journal,
    bottles: bottle ? journal.bottles.map(b => b.whiskyId === whisky.id ? { ...b, quantity: b.quantity + 1 } : b)
      : [...journal.bottles, { whiskyId: whisky.id, quantity: 1, opened: false }],
    wishlist: journal.wishlist.filter(id => id !== whisky.id),
    ...(remember ? { barcodeLinks: [...links.filter(link => link.code !== code), { code, whiskyId: whisky.id }] } : {}),
  }
}

/** Readable EAN-8 / UPC-A / EAN-13, retaining significant zeros and GTIN equivalence. */
export function displayBarcode(input: string): string {
  const code = normalizeBarcode(input)
  if (!code) return input
  return code.startsWith('000000') ? code.slice(6) : code.startsWith('00') ? code.slice(2) : code.startsWith('0') ? code.slice(1) : code
}
