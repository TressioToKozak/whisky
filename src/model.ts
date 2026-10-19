import { normalizeBarcode } from './barcode.ts'
import type { BarcodeLink } from './barcode.ts'

export type Whisky = {
  id: string; name: string; brand: string; series: string; category: 'Klasyka' | 'Edycja specjalna' | 'Kolekcjonerska';
  abv: number | null; age: number | null; volume: number | null; country: string;
  description: string; image: string; source: string; imageSource: string; tags: string[]; aliases?: string[]; custom?: boolean;
}
export type Review = { id: string; whiskyId: string; score: number; note: string; date: string; tags: string[] }
export type Bottle = { whiskyId: string; quantity: number; opened: boolean }
export type Journal = { version: 1; custom: Whisky[]; reviews: Review[]; bottles: Bottle[]; wishlist: string[]; barcodeLinks?: BarcodeLink[] }
export const STORAGE_KEY = 'dram.journal.v1'
export const emptyJournal = (): Journal => ({ version: 1, custom: [], reviews: [], bottles: [], wishlist: [] })
export const safeUrl = (value: unknown): value is string => typeof value === 'string' && (value === '' || /^https:\/\/[^\s]+$/.test(value))
const string = (v: unknown, max = 10000): v is string => typeof v === 'string' && v.length <= max
const number = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
export function validateJournal(value: unknown, catalogIds: string[]): Journal {
  if (!value || typeof value !== 'object') throw Error('Nieprawidłowy plik kopii danych.')
  const d = value as Journal
  if (d.version !== 1 || !Array.isArray(d.custom) || !Array.isArray(d.reviews) || !Array.isArray(d.bottles) || !Array.isArray(d.wishlist)) throw Error('Nieobsługiwany format kopii. Wybierz plik JSON wyeksportowany z Dram.')
  if (d.custom.length > 2000 || d.reviews.length > 10000 || d.bottles.length > 4000 || d.wishlist.length > 4000) throw Error('Kopia przekracza dozwoloną liczbę wpisów.')
  for (const w of d.custom) {
    if (!w || !string(w.id, 100) || !w.id.startsWith('custom-') || !string(w.name, 150) || !w.name.trim() || !string(w.brand, 100) || !w.brand.trim() || !string(w.series, 100) || !['Klasyka', 'Edycja specjalna', 'Kolekcjonerska'].includes(w.category) || !(w.abv === null || number(w.abv, 0.1, 100)) || !(w.age === null || (number(w.age, 1, 100) && Number.isInteger(w.age))) || !(w.volume === null || (number(w.volume, 1, 10000) && Number.isInteger(w.volume))) || !string(w.country, 100) || !string(w.description, 3000) || !string(w.image, 1500000) || !(safeUrl(w.image) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(w.image)) || !safeUrl(w.source) || !safeUrl(w.imageSource) || !Array.isArray(w.tags) || w.tags.some(t => !string(t, 50)) || w.tags.length > 10) throw Error('Kopia zawiera nieprawidłowe dane whisky.')
  }
  const ids = new Set([...catalogIds, ...d.custom.map(w => w.id)])
  if (ids.size !== catalogIds.length + d.custom.length) throw Error('Kopia zawiera powtarzające się identyfikatory whisky.')
  if (new Set(d.reviews.map(r => r?.id)).size !== d.reviews.length || new Set(d.bottles.map(b => b?.whiskyId)).size !== d.bottles.length || new Set(d.wishlist).size !== d.wishlist.length) throw Error('Kopia zawiera powtarzające się wpisy.')
  for (const r of d.reviews) if (!r || !string(r.id, 100) || !ids.has(r.whiskyId) || !number(r.score, 1, 10) || r.score * 2 % 1 !== 0 || !string(r.note, 3000) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || (!Number.isFinite(Date.parse(r.date)) || new Date(r.date).toISOString().slice(0,10) !== r.date) || !Array.isArray(r.tags) || r.tags.length > 10 || r.tags.some(t => !string(t, 50))) throw Error('Kopia zawiera nieprawidłową degustację.')
  for (const b of d.bottles) if (!b || !ids.has(b.whiskyId) || !number(b.quantity, 1, 999) || !Number.isInteger(b.quantity) || typeof b.opened !== 'boolean') throw Error('Kopia zawiera nieprawidłowy wpis w barku.')
  for (const id of d.wishlist) if (!ids.has(id)) throw Error('Kopia zawiera nieznaną whisky na liście życzeń.')
  if (d.barcodeLinks !== undefined && (!Array.isArray(d.barcodeLinks) || d.barcodeLinks.length > 4000 || d.barcodeLinks.some(link => !link || typeof link.code !== 'string' || normalizeBarcode(link.code) !== link.code || !ids.has(link.whiskyId)) || new Set(d.barcodeLinks.map(link => link.code)).size !== d.barcodeLinks.length)) throw Error('Zapis zawiera nieprawidłowe dopasowania kodów kreskowych.')
  // Keep only the supported fields. Never import a user's arbitrary object properties.
  return { version: 1, custom: d.custom.map(w => ({ id:w.id,name:w.name,brand:w.brand,series:w.series,category:w.category,abv:w.abv,age:w.age,volume:w.volume,country:w.country,description:w.description,image:w.image,source:w.source,imageSource:w.imageSource,tags:w.tags,custom:true })), reviews: d.reviews.map(r => ({id:r.id,whiskyId:r.whiskyId,score:r.score,note:r.note,date:r.date,tags:r.tags})), bottles:d.bottles.map(b => ({whiskyId:b.whiskyId,quantity:b.quantity,opened:b.opened})), wishlist:[...d.wishlist], ...(d.barcodeLinks !== undefined ? {barcodeLinks:d.barcodeLinks.map(link => ({code:link.code,whiskyId:link.whiskyId}))} : {}) }
}
export const average = (reviews: Review[]): number | null => reviews.length ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length : null
export const formatScore = (value: number, language = 'pl-PL') => value.toLocaleString(language, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export function matchesWhisky(w: Whisky, query: string) {
  const normalize = (text: string) => text.toLocaleLowerCase('pl').replace(/ł/g, 'l').normalize('NFD').replace(/\p{M}/gu, '').replace(/[’'™]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const haystack = normalize([w.brand, w.name, w.series, ...w.tags, ...(w.aliases ?? [])].join(' '))
  const compact = haystack.replace(/\s/g, '')
  return normalize(query).split(/\s+/).every(term => haystack.includes(term) || compact.includes(term))
}
