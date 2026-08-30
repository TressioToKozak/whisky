import catalog from './rzeszowska-beczka-whisky-catalog-z-linkami-zdjec.json'

export type Segment = 'Wejściowa' | 'Standard' | 'Premium' | 'Prestige'

type CatalogWhisky = (typeof catalog.whiskies)[number]

export type Whisky = CatalogWhisky & {
  price25: number
  price50: number
  imageUrl: string
}

const multiplier25: Record<Segment, number> = {
  Wejściowa: 4,
  Standard: 4,
  Premium: 4.2,
  Prestige: 4.5,
}

const multiplier50: Record<Segment, number> = {
  Wejściowa: 3.7,
  Standard: 3.7,
  Premium: 3.8,
  Prestige: 4.1,
}

/** Public menu data. Purchase information remains available only as catalog metadata. */
export const whiskies: Whisky[] = catalog.whiskies.map((whisky) => {
  const segment = whisky.segment as Segment
  return {
    ...whisky,
    price25: Math.max(9, Math.ceil(whisky.purchase.costPer25mlPln * multiplier25[segment])),
    price50: Math.max(16, Math.ceil(whisky.purchase.costPer50mlPln * multiplier50[segment])),
    imageUrl: whisky.image.remoteUrl,
  }
})

export const flights = [
  { name: 'Pierwszy krok', price: 69, accent: 'Łagodnie i owocowo', items: '3 × 20 ml', desc: 'Irlandia, Speyside i bourbon — idealny początek świadomej przygody.' },
  { name: 'Dym nad torfowiskiem', price: 89, accent: 'Mocno i morsko', items: '3 × 20 ml', desc: 'Trzy oblicza torfu: mineralne, medyczne i słodko-dymne.' },
  { name: 'Dookoła świata', price: 99, accent: 'Nieoczywiste kierunki', items: '4 × 20 ml', desc: 'Japonia, Tajwan, USA i Szkocja w jednej podróży przy barze.' },
]
