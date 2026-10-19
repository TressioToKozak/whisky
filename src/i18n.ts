import english from './english.json' with { type: 'json' }
import { getPreferences } from './preferences.ts'
const dictionary = english as Record<string, string>
export const locale = () => getPreferences().language === 'en' ? 'en-GB' : 'pl-PL'
/** Only presentation text is translated; catalogue IDs, saved tags and user notes stay intact. */
export const t = (text: string): string => getPreferences().language === 'en' ? dictionary[text] ?? text : text
export function interpolate(text: string, ...values: (string | number)[]) {
  return values.reduce<string>((result, value, i) => result.replace(`{${i}}`, String(value)), t(text))
}
