import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight, ScanBarcode } from 'lucide-react'
import { brands, brandOf } from '../brands'
import type { BrandId } from '../brands'
import type { Journal, Whisky } from '../model'
import { formatScore } from '../model'
import { euro } from '../pricing'
import { counted, SearchField, shortDate } from './Primitives'

type Section = 'discover' | 'bar' | 'wishlist' | 'reviews'
type Props = { all: Whisky[]; journal: Journal; valuation: { amount: number; missing: number }; query: string; onQuery: (value: string) => void; onBrand: (brand: BrandId | 'custom') => void; onGo: (section: Section) => void; onOpen: (w: Whisky) => void; onScan: () => void; results: ReactNode; resultCount: number }
export default function Discovery({ all, journal, valuation, query, onQuery, onBrand, onGo, onOpen, onScan, results, resultCount }: Props) {
  const bottleCount = journal.bottles.reduce((n, b) => n + b.quantity, 0)
  const hasJournal = bottleCount > 0 || journal.reviews.length > 0 || journal.wishlist.length > 0 || journal.custom.length > 0
  const lastReview = [...journal.reviews].reverse().sort((a, b) => b.date.localeCompare(a.date))[0]
  const lastWhisky = lastReview && all.find(w => w.id === lastReview.whiskyId)
  return <section className="brand-picker" aria-label="Odkrywaj whisky">
    <header className="discovery-intro"><div><p className="page-kicker">Odkrywaj</p><h1>Dziennik whisky</h1></div><p className="catalog-size">{all.length} whisky<span>w katalogu</span></p></header>
    <SearchField value={query} onChange={onQuery} label="Szukaj we wszystkich markach" placeholder="Znajdź whisky, niezależnie od marki" className="discovery-search"/>
    {query.trim() ? <section aria-label="Wyniki wyszukiwania"><p className="global-results-count" role="status">{counted(resultCount, 'wynik', 'wyniki', 'wyników')} · wszystkie marki</p>{results}</section> : <>
      {hasJournal ? <section className="home-collection" aria-label="Podsumowanie kolekcji"><div className="section-heading"><h2>Twój dziennik</h2><button className="text-button" onClick={() => onGo('bar')}>Otwórz barek <ArrowRight size={16}/></button></div><dl className="collection-stats"><div><dt>Butelki w barku</dt><dd><button onClick={() => onGo('bar')}>{bottleCount}</button></dd></div><div><dt>Degustacje</dt><dd><button onClick={() => onGo('reviews')}>{journal.reviews.length}</button></dd></div><div><dt>{bottleCount > valuation.missing ? 'Wartość barku' : 'Na liście życzeń'}</dt><dd><button onClick={() => onGo(bottleCount > valuation.missing ? 'bar' : 'wishlist')}>{bottleCount > valuation.missing ? euro(valuation.amount) : journal.wishlist.length}</button></dd></div></dl>{valuation.missing > 0 && <p className="summary-note">{counted(valuation.missing, 'butelka bez wyceny', 'butelki bez wyceny', 'butelek bez wyceny')}</p>}
      {lastWhisky && lastReview && <button className="last-tasting" onClick={() => onOpen(lastWhisky)}><div><p className="page-kicker">Ostatnia degustacja · {shortDate(lastReview.date)}</p><h3>{lastWhisky.brand} {lastWhisky.name}</h3>{lastReview.note && <p className="last-tasting-note">{lastReview.note}</p>}</div><span className="last-tasting-score">{formatScore(lastReview.score)}<small>/ 10</small></span><ArrowRight size={19}/></button>}</section>
      : <section className="first-bottle"><div><h2>Dodaj pierwszą butelkę</h2><p>Znajdź ją w katalogu lub zeskanuj kod z etykiety.</p></div><button className="text-button" onClick={onScan}><ScanBarcode size={19}/> Skanuj butelkę</button></section>}
      <section className="brand-directory" aria-labelledby="brands-heading"><div className="section-heading"><h2 id="brands-heading">Wybierz markę</h2><span>{counted(brands.length, 'marka', 'marki', 'marek')}</span></div><div className="brand-grid">{brands.map((b, i) => {
        const count = all.filter(w => brandOf(w) === b.id).length
        return <button key={b.id} className={`brand-card brand-${b.id} ${i < 2 ? 'brand-featured' : ''}`} aria-label={`Otwórz ${b.name} ${counted(count, 'wydanie', 'wydania', 'wydań')}`} onClick={() => onBrand(b.id)}><div className="brand-logo"><img src={`${import.meta.env.BASE_URL}brands/${b.logo}`} alt={`Logo ${b.name}`}/></div><div className="brand-card-caption"><span>{b.name}{' '}<small>{counted(count, 'wydanie', 'wydania', 'wydań')}</small></span><ChevronRight size={18}/></div></button>
      })}</div></section>
      {journal.custom.length > 0 && <button className="personal-catalog" onClick={() => onBrand('custom')}><span>Moje własne wpisy<small>Whisky dodane przez Ciebie</small></span><b>{journal.custom.length}</b><ChevronRight size={18}/></button>}
    </>}
  </section>
}
