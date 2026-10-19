import { interpolate, t } from '../i18n'
import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { brands } from '../brands'
import type { BrandId } from '../brands'
import type { Journal } from '../model'
import { counted, SearchField } from './Primitives'

type Props = { journal: Journal; query: string; onQuery: (value: string) => void; onBrand: (brand: BrandId | 'custom') => void; onGo: (section: 'bar') => void; onCreate: () => void; results: ReactNode; resultCount: number }
export default function Discovery({ journal, query, onQuery, onBrand, onGo, onCreate, results, resultCount }: Props) {
  return <section className="brand-picker" aria-label={t("Odkrywaj whisky")}>
    <h1 className="sr-only">{t("Odkrywaj whisky")}</h1>
    <SearchField value={query} onChange={onQuery} label={t("Szukaj we wszystkich markach")} placeholder={t("Szukaj whisky")} className="discovery-search"/>
    {query.trim() ? <section aria-label={t("Wyniki wyszukiwania")}><p className="global-results-count" role="status">{counted(resultCount, 'wynik', 'wyniki', 'wyników')}</p>{results}</section> : <>
      <div className="discovery-shortcut"><button className="text-button" onClick={() => onGo('bar')}>{t("Mój barek")} <ArrowRight size={16}/></button></div>
      <section className="brand-directory" aria-labelledby="brands-heading"><h2 id="brands-heading">{t("Wybierz markę")}</h2><div className="brand-grid">{brands.map(b => {
        const count = b.count
        return <button key={b.id} className={`brand-card brand-${b.id}`} aria-label={interpolate('Otwórz {0}', t(b.name))} onClick={() => onBrand(b.id)}><div className="brand-logo">{b.logo ? <img src={`${import.meta.env.BASE_URL}brands/${b.logo}`} alt={interpolate('Logo {0}', t(b.name))}/> : <span className="brand-text">{b.name}</span>}</div><div className="brand-card-caption"><span>{t(b.name)}</span><ChevronRight size={16}/></div><span className="sr-only">{counted(count, 'wydanie', 'wydania', 'wydań')}</span></button>
      })}</div></section>
    </>}
    <div className="personal-tools">{journal.custom.length > 0 && <button className="text-button" onClick={() => onBrand('custom')}>{t("Moje własne wpisy")}</button>}<button className="text-button custom-create" onClick={onCreate}>{t("Brakuje whisky w katalogu?")}</button></div>
  </section>
}
