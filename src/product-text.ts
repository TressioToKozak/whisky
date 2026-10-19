import texts from './product-text.json' with {type:'json'}
import {getPreferences} from './preferences.ts'
import type {Whisky} from './model'
const copy = texts as Record<string,{pl:string;en:string}>
/** User-authored text is never translated or overwritten. Catalogue copy is keyed by stable ID. */
export function productDescription(w: Whisky): string {
  return w.custom ? w.description : copy[w.id]?.[getPreferences().language] ?? w.description
}
