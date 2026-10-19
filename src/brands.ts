import type { Whisky } from './model'
export const brands = [
  { id: 'jameson', name: 'Jameson', logo: 'jameson.png' },
  { id: 'johnnie-walker', name: 'Johnnie Walker', logo: 'johnnie-walker.svg' },
  { id: 'jack-daniels', name: 'Jack Daniel’s', logo: 'jack-daniels.svg' },
  { id: 'jim-beam', name: 'Jim Beam', logo: 'jim-beam.svg' },
  { id: 'goldfinch', name: 'Goldfinch', logo: 'goldfinch.png' },
  { id: 'ardbeg', name: 'Ardbeg', logo: 'ardbeg.svg' },
  { id: 'bushmills', name: 'Bushmills', logo: 'bushmills.svg' },
  { id: 'ballantines', name: 'Ballantine’s', logo: 'ballantines.svg' },
  { id: 'toki', name: 'Toki', logo: 'toki.png' },
  { id: 'glenfiddich', name: 'Glenfiddich', logo: 'glenfiddich.png' },
  { id: 'chivas', name: 'Chivas Regal', logo: 'chivas.svg' },
  { id: 'other', name: 'Inne', logo: 'other.svg' },
] as const
export type BrandId = typeof brands[number]['id']
export const brandOf = (w: Whisky): BrandId | undefined => {
  const name = w.brand.toLowerCase().replace(/[^a-z]/g, '')
  if (name === 'johnniewalker' || name === 'johnwalkersons') return 'johnnie-walker'
  if (name === 'chivas' || name === 'chivasregal') return 'chivas'
  if (name === 'jackdaniels') return 'jack-daniels'
  return brands.find(b => b.id.replace(/-/g, '') === name)?.id ?? (w.custom ? undefined : 'other')
}
