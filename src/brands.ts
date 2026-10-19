import type { Whisky } from './model'
import catalog from './catalog.json' with { type: 'json' }
const artwork = [
  { id: 'jameson', name: 'Jameson', logo: 'jameson.png' },
  { id: 'johnnie-walker', name: 'Johnnie Walker', logo: 'johnnie-walker.svg' },
  { id: 'jack-daniels', name: 'Jack Daniel’s', logo: 'jack-daniels.svg' },
  { id: 'jim-beam', name: 'Jim Beam', logo: 'jim-beam.svg' },
  { id: 'goldfinch', name: 'Goldfinch', logo: 'goldfinch.png' },
  { id: 'ardbeg', name: 'Ardbeg', logo: 'ardbeg.svg' },
  { id: 'bushmills', name: 'Bushmills', logo: 'bushmills.svg' },
  { id: 'ballantines', name: 'Ballantine’s', logo: 'ballantines.svg' },
  { id: 'suntory', name: 'Suntory', logo: 'suntory.svg' },
  { id: 'glenfiddich', name: 'Glenfiddich', logo: 'glenfiddich.png' },
  { id: 'chivas', name: 'Chivas Regal', logo: 'chivas.svg' },
  { id: 'other', name: 'Inne', logo: 'other.svg' },
] as const
export type BrandId = string
export type BrandGroup = {id: BrandId; name: string; logo: string; count: number}
export function brandKey(name: string): string {
  const key = name.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]/g,'')
  return ({johnwalkersons:'johnniewalker',chivasregal:'chivas',toki:'suntory',hibiki:'suntory',yamazaki:'suntory',hakushu:'suntory',themacallan:'macallan'} as Record<string,string>)[key] ?? key
}
/** Only public, distinct catalogue IDs set the threshold. Artwork is optional metadata. */
export function createBrandDirectory(catalog: Pick<Whisky,'id'|'brand'|'custom'>[]): BrandGroup[] {
  const groups = new Map<string,{name:string;ids:Set<string>}>(), seen = new Set<string>()
  for (const w of catalog) {
    if (w.custom || seen.has(w.id)) continue
    seen.add(w.id)
    const key = brandKey(w.brand), group = groups.get(key) ?? {name:w.brand,ids:new Set<string>()}
    group.ids.add(w.id);groups.set(key,group)
  }
  const priority = (key:string) => artwork.findIndex(b=>brandKey(b.name)===key)
  const named = [...groups].filter(([,g])=>g.ids.size>=4).sort(([a,ga],[b,gb])=>{
    const pa=priority(a),pb=priority(b)
    return (pa<0?999:pa)-(pb<0?999:pb) || ga.name.localeCompare(gb.name,'pl')
  }).map(([key,g])=>{
    const art=artwork.find(b=>brandKey(b.name)===key)
    return {id:art?.id ?? `brand-${key}`,name:art?.name ?? g.name,logo:art?.logo ?? '',count:g.ids.size}
  })
  return [...named,{id:'other',name:'Inne',logo:'other.svg',count:[...groups.values()].filter(g=>g.ids.size<4).reduce((n,g)=>n+g.ids.size,0)}]
}
export const brands = createBrandDirectory(catalog)
export const brandOf = (w: Pick<Whisky,'brand'|'custom'>): BrandId | undefined =>
  brands.find(b=>b.id!=='other' && brandKey(b.name)===brandKey(w.brand))?.id ?? (w.custom ? undefined : 'other')
