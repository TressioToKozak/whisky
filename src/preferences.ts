export type Language = 'pl' | 'en'
export type Region = 'NL' | 'PL'
export type Preferences = { language: Language; region: Region }
export const PREFERENCES_KEY = 'dram.preferences.v1'
export const defaults: Preferences = { language: 'pl', region: 'NL' }
export function parsePreferences(raw: string | null): Preferences {
  try { const value = JSON.parse(raw ?? 'null'); return { language: value?.language === 'en' ? 'en' : 'pl', region: value?.region === 'PL' ? 'PL' : 'NL' } } catch { return { ...defaults } }
}
let current: Preferences = typeof window === 'undefined' ? defaults : (() => { try { return parsePreferences(localStorage.getItem(PREFERENCES_KEY)) } catch { return { ...defaults } } })()
const listeners = new Set<() => void>()
export const getPreferences = () => current
export const subscribePreferences = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function updatePreferences(patch: Partial<Preferences>): boolean {
  current = parsePreferences(JSON.stringify({ ...current, ...patch }))
  let saved = true
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(current)) } catch { saved = false }
  listeners.forEach(listener => listener())
  return saved
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key !== PREFERENCES_KEY && event.key !== null) return
  current = parsePreferences(event.newValue); listeners.forEach(listener => listener())
})
