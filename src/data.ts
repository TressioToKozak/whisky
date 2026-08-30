export type Whisky = {
  slug: string; name: string; region: string; country: string; style: string;
  age: string; abv: string; price: number; notes: string[]; description: string;
}

export const whiskies: Whisky[] = [
  { slug: 'glenallachie-12', name: 'The GlenAllachie 12', region: 'Speyside', country: 'Szkocja', style: 'Single Malt', age: '12 lat', abv: '46%', price: 32, notes: ['miód', 'rodzynki', 'kakao'], description: 'Bogaty, dojrzewający w beczkach po sherry single malt. Pełny i deserowy, z długim korzennym finiszem.' },
  { slug: 'ardbeg-10', name: 'Ardbeg Ten', region: 'Islay', country: 'Szkocja', style: 'Single Malt', age: '10 lat', abv: '46%', price: 34, notes: ['torf', 'cytrusy', 'sól'], description: 'Wyrazisty dym spotyka świeżą cytrynę i morską bryzę. Klasyka dla poszukujących intensywnych wrażeń.' },
  { slug: 'redbreast-12', name: 'Redbreast 12', region: 'Cork', country: 'Irlandia', style: 'Single Pot Still', age: '12 lat', abv: '40%', price: 31, notes: ['orzech', 'figa', 'wanilia'], description: 'Kremowa irlandzka whiskey o soczystym, owocowym charakterze i aksamitnym, rozgrzewającym finiszu.' },
  { slug: 'woodford-reserve', name: 'Woodford Reserve', region: 'Kentucky', country: 'USA', style: 'Bourbon', age: 'NAS', abv: '43,2%', price: 26, notes: ['karmel', 'dąb', 'pomarańcza'], description: 'Klasyczny bourbon o głębokiej słodyczy, przełamanej przyprawami i prażonym dębem.' },
  { slug: 'nikka-from-the-barrel', name: 'Nikka From The Barrel', region: 'Hokkaido', country: 'Japonia', style: 'Blended', age: 'NAS', abv: '51,4%', price: 35, notes: ['morela', 'pieprz', 'toffi'], description: 'Precyzyjny, skoncentrowany blend. Owocowa słodycz i pikantne przyprawy w wyjątkowo długim finiszu.' },
  { slug: 'kavalan-classic', name: 'Kavalan Classic', region: 'Yilan', country: 'Tajwan', style: 'Single Malt', age: 'NAS', abv: '40%', price: 38, notes: ['mango', 'wanilia', 'kokos'], description: 'Tropikalny single malt dojrzewający w ciepłym klimacie. Soczysty, egzotyczny i wyjątkowo gładki.' },
  { slug: 'talisker-10', name: 'Talisker 10', region: 'Skye', country: 'Szkocja', style: 'Single Malt', age: '10 lat', abv: '45,8%', price: 30, notes: ['pieprz', 'dym', 'morze'], description: 'Morski i pieprzny malt z wyspy Skye. Dym jest tutaj elegancki, a finisz ciepły i mineralny.' },
  { slug: 'makers-mark', name: "Maker's Mark", region: 'Kentucky', country: 'USA', style: 'Bourbon', age: 'NAS', abv: '45%', price: 24, notes: ['wanilia', 'wiśnia', 'karmel'], description: 'Łagodny wheated bourbon, w którym słodycz wanilii i karmelu spotyka dojrzałą wiśnię.' },
]

export const flights = [
  { name: 'Pierwszy krok', price: 69, accent: 'Łagodnie i owocowo', items: '3 × 20 ml', desc: 'Irlandia, Speyside i bourbon — idealny początek świadomej przygody.' },
  { name: 'Dym nad torfowiskiem', price: 89, accent: 'Mocno i morsko', items: '3 × 20 ml', desc: 'Trzy oblicza torfu: mineralne, medyczne i słodko-dymne.' },
  { name: 'Dookoła świata', price: 99, accent: 'Nieoczywiste kierunki', items: '4 × 20 ml', desc: 'Japonia, Tajwan, USA i Szkocja w jednej podróży przy barze.' },
]
