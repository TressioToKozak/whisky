import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { brands, brandOf } from '../brands'
import type { BrandId } from '../brands'
import type { Journal, Whisky } from '../model'
import { counted, SearchField } from './Primitives'

type Props = { all: Whisky[]; journal: Journal; query: string; onQuery: (value: string) => void; onBrand: (brand: BrandId | 'custom') => void; onGo: (section: 'bar') => void; onCreate: () => void; results: ReactNode; resultCount: number }
export default function Discovery({ all, journal, query, onQuery, onBrand, onGo, onCreate, results, resultCount }: Props) {
  return <section className="brand-picker" aria-label="Odkrywaj whisky">
    <h1 className="sr-only">Odkrywaj whisky</h1>
    <SearchField value={query} onChange={onQuery} label="Szukaj we wszystkich markach" placeholder="Szukaj whisky" className="discovery-search"/>
    {query.trim() ? <section aria-label="Wyniki wyszukiwania"><p className="global-results-count" role="status">{counted(resultCount, 'wynik', 'wyniki', 'wyników')}</p>{results}</section> : <>
      <div className="discovery-shortcut"><button className="text-button" onClick={() => onGo('bar')}>Mój barek <ArrowRight size={16}/></button></div>
      <section className="brand-directory" aria-labelledby="brands-heading"><h2 id="brands-heading">Wybierz markę</h2><div className="brand-grid">{brands.map(b => {
        const count = all.filter(w => brandOf(w) === b.id).length
        return <button key={b.id} className={`brand-card brand-${b.id}`} aria-label={`Otwórz ${b.name}`} onClick={() => onBrand(b.id)}><div className="brand-logo"><img src={`${import.meta.env.BASE_URL}brands/${b.logo}`} alt={`Logo ${b.name}`}/></div><div className="brand-card-caption"><span>{b.name}</span><ChevronRight size={16}/></div><span className="sr-only">{counted(count, 'wydanie', 'wydania', 'wydań')}</span></button>
      })}</div></section>
    </>}
    <div className="personal-tools">{journal.custom.length > 0 && <button className="text-button" onClick={() => onBrand('custom')}>Moje własne wpisy</button>}<button className="text-button custom-create" onClick={onCreate}>Brakuje whisky w katalogu?</button></div>
  </section>
}
