import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, ChevronRight, Compass, GlassWater, Library, ListFilter, Minus, Plus, ScanBarcode, Search, Star, Trash2, Upload, Wine, X } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import barcodeData from './barcodes.json'
import { addBarcodeBottle } from './barcode'
import type { BarcodeEntry } from './barcode'
import { brands, brandOf } from './brands'
import type { BrandId } from './brands'
import catalogData from './catalog.json'
import priceData from './prices.json'
import photoLayoutData from './photo-layout.json'
import { cellarValue, comparePrices, euro, marketLabel, priceLabel } from './pricing'
import type { PriceQuote } from './pricing'
import { average, emptyJournal, formatScore, matchesWhisky, safeUrl, STORAGE_KEY, today, validateJournal } from './model'
import type { Journal, Review, Whisky } from './model'

const catalog = catalogData as Whisky[]
const catalogIds = catalog.map(w => w.id)
const prices = priceData as Record<string, PriceQuote>
const photoLayouts = photoLayoutData as Record<string, { inset: string; background: string; ratio: number; clipPath?: string }>
const photoBackground = (w: Whisky) => ({ background: photoLayouts[w.id]?.background ?? '#fff' })
const decimal = (n: number) => n.toLocaleString('pl-PL')
const counted = (n: number, one: string, few: string, many: string) => `${decimal(n)} ${({ one, few } as Record<string, string>)[new Intl.PluralRules('pl').select(n)] ?? many}`
const categories = ['Wszystkie', 'Klasyka', 'Edycja specjalna', 'Kolekcjonerska'] as const
const tastingTags = ['Dym', 'Torf', 'Miód', 'Wanilia', 'Owoce', 'Cytrusy', 'Przyprawy', 'Dąb', 'Czekolada', 'Karmel']
type Tab = 'discover' | 'bar' | 'wishlist' | 'reviews'
const tabs: { id: Tab; name: string; mobile: string; icon: typeof Compass }[] = [
  { id: 'discover', name: 'Odkrywaj', mobile: 'Odkrywaj', icon: Compass },
  { id: 'bar', name: 'Mój barek', mobile: 'Barek', icon: Library },
  { id: 'wishlist', name: 'Lista życzeń', mobile: 'Życzenia', icon: Bookmark },
  { id: 'reviews', name: 'Moje oceny', mobile: 'Oceny', icon: Star },
]
function loadJournal() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return { data: raw ? validateJournal(JSON.parse(raw), catalogIds) : emptyJournal(), error: '' } }
  catch { return { data: emptyJournal(), error: 'Nie udało się odczytać dziennika. Dotychczasowy zapis nie zostanie nadpisany.' } }
}
function Photo({ whisky, className = '', eager = false }: { whisky: Whisky; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (!whisky.image || failed) return <div className={`photo-missing ${className}`}><Wine size={32} strokeWidth={1}/><span>Zdjęcie niedostępne</span></div>
  return <img className={`bottle-photo ${className}`} style={{ objectViewBox: photoLayouts[whisky.id]?.inset, '--photo-ratio': photoLayouts[whisky.id]?.ratio ?? 1, '--photo-clip': photoLayouts[whisky.id]?.clipPath ?? 'none', ...(photoLayouts[whisky.id]?.clipPath ? { maskImage: 'none' } : {}) } as CSSProperties} src={whisky.image.startsWith('/') ? `${import.meta.env.BASE_URL}${whisky.image.slice(1)}` : whisky.image} alt={`${whisky.brand} ${whisky.name} — zdjęcie butelki`} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
}
function Modal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => { document.body.style.overflow = oldOverflow; dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className={`modal ${className}`} aria-label={title} onCancel={e => { e.preventDefault(); onClose() }} onClick={e => { if (e.target === ref.current) onClose() }}><div className="modal-content"><div className="modal-heading"><span>{title}</span><button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={21}/></button></div>{children}</div></dialog>
}

export default function App() {
  const [initial] = useState(loadJournal)
  const [journal, setJournal] = useState<Journal>(initial.data)
  const [storageError, setStorageError] = useState(initial.error)
  const [readBlocked] = useState(Boolean(initial.error))
  const [tab, setTab] = useState<Tab>('discover')
  const [brand, setBrand] = useState<BrandId | 'custom' | null>(null)
  const activeBrand = brand === 'custom' ? {name: 'Własne wpisy', logo: ''} : brands.find(b => b.id === brand)
  const inSelectedBrand = (w: Whisky) => !brand || (brand === 'custom' ? Boolean(w.custom) : brandOf(w) === brand)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('Wszystkie')
  const [sort, setSort] = useState('price-asc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Whisky | null>(null)
  const [ratingWhisky, setRatingWhisky] = useState<Whisky | null>(null)
  const [adding, setAdding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void } | null>(null)
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(1)
  const [reviewEdit, setReviewEdit] = useState<Review | undefined>()
  const [age, setAge] = useState(() => { try { return localStorage.getItem('dram.age') === 'yes' } catch { return false } })
  const all = useMemo(() => [...catalog, ...journal.custom], [journal.custom])
  useEffect(() => {
    if (readBlocked) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(journal)); setStorageError('') }
    catch { setStorageError('Nie udało się zapisać zmian. Sprawdź wolne miejsce i spróbuj ponownie.') }
  }, [journal, readBlocked])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3300); return () => clearTimeout(t) }, [toast])
  useEffect(() => { setPage(1) }, [tab, brand, query, category, sort])
  const notify = (message: string) => setToast(message)
  const go = (next: Tab) => { setTab(next); if (next === 'discover') setBrand(null); setQuery(''); setCategory('Wszystkie'); setSort('price-asc'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const reviewsFor = (id: string) => journal.reviews.filter(r => r.whiskyId === id)
  const inBar = (id: string) => journal.bottles.find(b => b.whiskyId === id)
  const wished = (id: string) => journal.wishlist.includes(id)
  function toggleWish(w: Whisky) {
    setJournal(j => ({ ...j, wishlist: j.wishlist.includes(w.id) ? j.wishlist.filter(id => id !== w.id) : [...j.wishlist, w.id] }))
    notify(wished(w.id) ? 'Usunięto z listy życzeń' : 'Dodano do listy życzeń')
  }
  function addBar(w: Whisky) {
    if (inBar(w.id)) { setSelected(w); return }
    setJournal(j => ({ ...j, bottles: [...j.bottles, { whiskyId: w.id, quantity: 1, opened: false }], wishlist: j.wishlist.filter(id => id !== w.id) }))
    notify('Whisky jest już w Twoim barku')
  }
  function changeQuantity(id: string, quantity: number) {
    if (quantity < 1) {
      setConfirm({ title: 'Usunąć whisky z barku?', text: 'Twoje oceny i degustacje zostaną zachowane.', action: () => { setJournal(j => ({ ...j, bottles: j.bottles.filter(b => b.whiskyId !== id) })); notify('Usunięto z barku') } }); return
    }
    setJournal(j => ({ ...j, bottles: j.bottles.map(b => b.whiskyId === id ? { ...b, quantity: Math.min(999, quantity) } : b) }))
  }
  const displayed = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pl')
    const score = (id: string) => average(journal.reviews.filter(r => r.whiskyId === id)) ?? -1
    return all.filter(w => (tab !== 'discover' || inSelectedBrand(w)) && (tab === 'discover' || (tab === 'bar' && journal.bottles.some(b => b.whiskyId === w.id)) || (tab === 'wishlist' && journal.wishlist.includes(w.id)) || (tab === 'reviews' && journal.reviews.some(r => r.whiskyId === w.id))) && (category === 'Wszystkie' || w.category === category) && matchesWhisky(w, q))
      .sort((a,b) => sort === 'price-asc' ? comparePrices(prices[a.id], prices[b.id]) : sort === 'price-desc' ? comparePrices(prices[a.id], prices[b.id], true) : sort === 'name' ? `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'pl') : sort === 'rating' ? score(b.id) - score(a.id) : sort === 'age' ? (b.age ?? -1) - (a.age ?? -1) : 0)
  }, [all, tab, brand, journal, category, query, sort])
  const valuation = cellarValue(journal.bottles, prices)
  const totalBottles = journal.bottles.reduce((s, b) => s + b.quantity, 0)
    function exportData(raw = false) {
    let data: string
    try { data = raw ? localStorage.getItem(STORAGE_KEY) ?? '{}' : JSON.stringify(journal, null, 2) } catch { notify('Przeglądarka blokuje odczyt danych.'); return }
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `dram-kopia-${today()}.json`; a.click(); URL.revokeObjectURL(url)
    notify('Pobrano zapis dziennika')
  }
  const headings = {
    discover: [activeBrand?.name ?? 'Odkrywaj', 'Katalog whisky'],
    bar: ['Mój barek', `${journal.bottles.length} whisky · ${totalBottles} butelek`],
    wishlist: ['Lista życzeń', `${journal.wishlist.length} zapisanych whisky`],
    reviews: ['Moje oceny', `${journal.reviews.length} zapisanych degustacji`],
  }[tab]
  const catalogResults = displayed.length ? <><div className="whisky-grid">{displayed.slice(0, page * 24).map(w => {
            const score = average(reviewsFor(w.id)); const bottle = inBar(w.id)
            const quote = prices[w.id]
            return <article className="whisky-card" key={w.id} data-whisky-id={w.id}>
              <div className="card-photo-wrap" style={photoBackground(w)}><button className="photo-open" aria-label={`Zobacz ${w.brand} ${w.name}`} onClick={() => setSelected(w)}><Photo whisky={w}/></button>{bottle && <span className="owned-badge"><Check size={12}/> W barku{bottle.quantity > 1 ? ` · ${bottle.quantity}` : ''}</span>}</div>
              <div className="card-body"><button className={`wish-button ${wished(w.id) ? 'selected' : ''}`} aria-label={`${wished(w.id) ? 'Usuń z' : 'Dodaj do'} życzeń: ${w.name}`} aria-pressed={wished(w.id)} onClick={() => toggleWish(w)}><Bookmark size={18} fill={wished(w.id) ? 'currentColor' : 'none'}/></button><p className="card-brand">{w.brand}</p><button className="card-title" onClick={() => setSelected(w)}>{w.name}</button><p className="card-meta">{w.abv ? `${decimal(w.abv)}%` : 'Moc: —'}{w.volume && <> · {decimal(w.volume / 10)} cl</>}</p>
                <div className="card-price"><strong>{priceLabel(quote)}</strong>{quote && <span>{marketLabel(quote)}</span>}</div>
                {score !== null && <button className="card-rating has-score" onClick={() => {setReviewEdit(undefined);setRatingWhisky(w)}} aria-label={`Oceń ${w.name}`}><Star size={13} fill="currentColor"/><strong>{formatScore(score)}</strong><span>/ 10</span></button>}
                <button className={`add-bar ${bottle ? 'in-bar' : ''}`} onClick={() => addBar(w)}>{bottle ? <Check size={15}/> : <Plus size={15}/>} {bottle ? 'W moim barku' : 'Dodaj do barku'}{bottle && <ChevronRight size={15}/>}</button>
              </div></article>

          })}</div>{displayed.length > page * 24 && <div className="load-more"><button className="button outline" onClick={() => setPage(p => p+1)}>Pokaż kolejne whisky <ChevronDown size={17}/></button><p>Pokazano {Math.min(page*24, displayed.length)} z {displayed.length}</p></div>}</> : <div className="empty-state"><div className="empty-icon">{query || category !== 'Wszystkie' ? <Search size={31}/> : tab === 'bar' ? <Library size={31}/> : tab === 'wishlist' ? <Bookmark size={31}/> : <Star size={31}/>}</div><h3>{query || category !== 'Wszystkie' ? 'Nie znaleźliśmy takiej whisky' : tab === 'bar' ? 'Twój barek jest pusty' : tab === 'wishlist' ? 'Lista życzeń jest pusta' : 'Nie masz jeszcze ocen'}</h3><p>{query || category !== 'Wszystkie' ? 'Spróbuj innej nazwy albo zmień filtry.' : tab === 'bar' ? 'Znajdź w katalogu whisky, którą masz, i dodaj ją do swojego barku.' : tab === 'wishlist' ? 'Dotknij zakładki na karcie whisky, żeby zapisać ją na później.' : 'Otwórz whisky i zapisz wrażenia z degustacji. '}</p><button className="button dark" onClick={() => { if (query || category !== 'Wszystkie') {setQuery(''); setCategory('Wszystkie')} else go('discover') }}>{query || category !== 'Wszystkie' ? 'Wyczyść filtry' : 'Odkryj kolekcję'}<ArrowRight size={16}/></button></div>
  return <div className="app-shell">
    <a className="skip-link" href="#main">Przejdź do treści</a>
    <aside className="sidebar"><a className="brand" href="#" onClick={e => {e.preventDefault(); go('discover')}}><span className="brand-icon"><GlassWater size={25} strokeWidth={1.5}/></span>dram<span className="brand-dot">.</span></a><nav aria-label="Główna nawigacja">{tabs.map(t => <button key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}><t.icon size={20}/><span>{t.name}</span>{t.id === 'bar' && journal.bottles.length > 0 && <small>{journal.bottles.length}</small>}{t.id === 'wishlist' && journal.wishlist.length > 0 && <small>{journal.wishlist.length}</small>}</button>)}</nav></aside>
    <div className="main-shell"><header className="topbar"><div className="mobile-brand" onClick={() => go('discover')}><GlassWater size={23}/> dram<span>.</span></div><div className="breadcrumb">Dziennik <ChevronRight size={14}/><strong>{tabs.find(t => t.id === tab)?.name}</strong></div><div className="topbar-actions"><button className="icon-button scan-top" aria-label="Skanuj kod kreskowy" title="Skanuj kod kreskowy" onClick={() => setScanning(true)}><ScanBarcode size={23}/></button><button className="button dark add-top" onClick={() => setAdding(true)}><Plus size={17}/><span>Dodaj whisky</span></button></div></header>
      <main id="main" className="main-content">{storageError && <div role="alert" className="storage-alert">{storageError}<button onClick={() => exportData(true)}>Pobierz zapis do odzyskania</button></div>}
        {tab === 'discover' && !brand ? <section className="brand-picker" aria-labelledby="brands-heading"><div className="page-intro"><div><p className="page-kicker">Katalog whisky</p><h1 id="brands-heading">Wybierz markę</h1></div></div><div className="search discovery-search"><Search size={18}/><input type="search" aria-label="Szukaj we wszystkich markach" placeholder="Szukaj whisky we wszystkich markach" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Wyczyść wyszukiwanie" onClick={() => setQuery('')}><X size={16}/></button>}</div>{query.trim() ? <section aria-label="Wyniki wyszukiwania"><p className="global-results-count">{counted(displayed.length, 'wynik', 'wyniki', 'wyników')} · wszystkie marki</p>{catalogResults}</section> : <><div className="brand-grid">{brands.map(b => {
          const count = all.filter(w => brandOf(w) === b.id).length
          return <button key={b.id} className={`brand-card brand-${b.id}`} aria-label={`Otwórz ${b.name}`} onClick={() => {setBrand(b.id);setQuery('');setCategory('Wszystkie');setSort('price-asc');setFiltersOpen(false);window.scrollTo(0,0)}}><div className="brand-logo"><img src={`${import.meta.env.BASE_URL}brands/${b.logo}`} alt={`Logo ${b.name}`}/></div><div className="brand-card-caption"><span>{b.name}<small>{count ? counted(count, 'wydanie', 'wydania', 'wydań') : 'Wkrótce'}</small></span><ChevronRight size={17}/></div></button>
        })}</div>{journal.custom.length > 0 && <button className="personal-catalog" onClick={() => {setBrand('custom');setQuery('');setCategory('Wszystkie');setSort('price-asc')}}><Wine size={18}/> Moje własne wpisy <span>{journal.custom.length}</span><ChevronRight size={16}/></button>}</>}</section> : <>{tab === 'discover' && <button className="back-brands" onClick={() => go('discover')}><ChevronRight size={16}/> Wszystkie marki</button>}<div className="page-intro"><div><p className="page-kicker">{headings[1]}</p><h1>{headings[0]}<span className="count">{tab === 'discover' ? all.filter(w => inSelectedBrand(w)).length : displayed.length}</span></h1></div>{tab !== 'discover' && <button className="text-button" onClick={() => go('discover')}>Przeglądaj katalog <ArrowRight size={15}/></button>}</div>
        {tab === 'bar' && <button className="button outline full scan-cellar" onClick={() => setScanning(true)}><ScanBarcode size={20}/> Skanuj butelkę</button>}
        {tab === 'bar' && <section className="cellar-value" aria-label="Wartość barku"><div><p>Wartość barku</p><strong>{euro(valuation.amount)}</strong></div><div><span>Szacunkowo · ceny katalogowe</span>{valuation.missing > 0 && <small>Bez wyceny: {counted(valuation.missing, 'butelka', 'butelki', 'butelek')}</small>}</div></section>}
        <section className="catalog-section" aria-label={headings[0]}>
          {tab === 'discover' && !all.some(w => inSelectedBrand(w)) ? <div className={`empty-state brand-empty brand-${brand}`}>{activeBrand?.logo && <img src={`${import.meta.env.BASE_URL}brands/${activeBrand.logo}`} alt={`Logo ${activeBrand.name}`}/>}<h2>{brand === 'custom' ? 'Nie masz własnych wpisów' : 'Katalog w przygotowaniu'}</h2><p>{brand === 'custom' ? 'Dodaj butelkę, której nie ma w katalogu.' : `Butelki ${activeBrand?.name} pojawią się tutaj w kolejnej aktualizacji.`}</p><button className="button outline" onClick={() => go('discover')}>Wybierz inną markę</button></div> : <><div className="catalog-toolbar"><div className="search"><Search size={18}/><input type="search" aria-label="Szukaj whisky" placeholder="Szukaj nazwy lub edycji" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Wyczyść wyszukiwanie" onClick={() => setQuery('')}><X size={16}/></button>}</div><button className={`filter-toggle ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="catalog-filters"><ListFilter size={17}/><span>Filtry</span>{category !== 'Wszystkie' && <i/>}</button><label className="sort"><span>Sortuj:</span><select aria-label="Sortuj whisky" value={sort} onChange={e => setSort(e.target.value)}><option value="price-asc">Cena: od najniższej</option><option value="price-desc">Cena: od najwyższej</option><option value="name">Nazwa A–Z</option><option value="rating">Moja najwyższa ocena</option><option value="age">Wiek malejąco</option></select><ChevronDown size={14}/></label></div>
          <div id="catalog-filters" className="category-row" hidden={!filtersOpen}><div className="category-tabs" role="group" aria-label="Rodzaj edycji">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'active' : ''} aria-pressed={category === c}>{c === 'Wszystkie' ? 'Wszystkie whisky' : c}</button>)}</div></div>
          {catalogResults}
        </>}</section></>}
      </main></div>
    <nav className="bottom-nav" aria-label="Nawigacja mobilna">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}><t.icon size={21} strokeWidth={tab === t.id ? 2 : 1.6}/><span>{t.mobile}</span>{t.id === 'wishlist' && journal.wishlist.length > 0 && <i/>}</button>)}</nav>
    {toast && <div className="toast" role="status"><Check size={18}/><span>{toast}</span><button onClick={() => setToast('')} aria-label="Zamknij powiadomienie"><X size={16}/></button></div>}
    {scanning && <Modal title="Skaner kodów kreskowych" onClose={() => setScanning(false)} className="barcode-modal"><BarcodeScanner renderPhoto={w => <div className="barcode-photo" style={photoBackground(w)}><Photo whisky={w} eager/></div>} all={all} entries={barcodeData as BarcodeEntry[]} links={journal.barcodeLinks ?? []} bottles={journal.bottles} onCreate={code => { setScanning(false); setPendingBarcode(code); setAdding(true) }} onAdd={(w, code, remember) => {
      // Validate before closing the scanner so limits remain visible and recoverable.
      addBarcodeBottle(journal, w, code, remember)
      setJournal(j => addBarcodeBottle(j, w, code, remember)); setScanning(false); notify('Dodano butelkę do barku')
    }}/></Modal>}
    {selected && <Modal title="Poznaj whisky" onClose={() => setSelected(null)} className="detail-modal"><div className="detail-top"><div className="detail-photo" style={photoBackground(selected)}><Photo whisky={selected} eager/></div><div className="detail-intro"><div className="eyebrow">{selected.category}</div><p className="detail-brand">{selected.brand}</p><h2>{selected.name}</h2>{selected.description && !/^(Archiwalne lub kolekcjonerskie|Osobne wydanie|Whisky z rodziny)/.test(selected.description) && <p>{selected.description}</p>}{prices[selected.id] && <div className="detail-price"><div><strong>{priceLabel(prices[selected.id])}</strong><span>{marketLabel(prices[selected.id])}</span></div><details><summary>Źródło ceny i szczegóły</summary><a href={prices[selected.id].sourceUrl} target="_blank" rel="noopener noreferrer">{prices[selected.id].sourceName} <ArrowUpRight size={14}/></a><p>{prices[selected.id].note}</p><small>Sprawdzono: {prices[selected.id].checkedAt}{prices[selected.id].originalCurrency !== 'EUR' && ` · Cena źródłowa: ${prices[selected.id].originalAmount} ${prices[selected.id].originalCurrency}`}</small></details></div>}<div className="detail-specs"><div><small>POCHODZENIE</small><strong>{selected.country}</strong></div><div><small>MOC</small><strong>{selected.abv ? `${decimal(selected.abv)}%` : 'Niepodana'}</strong></div><div><small>WIEK</small><strong>{selected.age ? `${selected.age} lat` : 'NAS'}</strong></div><div><small>POJEMNOŚĆ</small><strong>{selected.volume ? `${selected.volume} ml` : 'Różne wydania'}</strong></div></div><div className="detail-tags">{selected.tags.map(t => <span key={t}>{t}</span>)}</div>{selected.source && <a className="source-link" href={selected.source} target="_blank" rel="noopener noreferrer">Źródło informacji <ArrowUpRight size={14}/></a>}{selected.imageSource && <a className="source-link" href={selected.imageSource} target="_blank" rel="noopener noreferrer">Źródło zdjęcia <ArrowUpRight size={14}/></a>}</div></div><div className="detail-actions"><button className="button dark" onClick={() => {setReviewEdit(undefined); setRatingWhisky(selected); setSelected(null)}}><Star size={17}/> Zapisz degustację</button><button className={`button outline ${wished(selected.id) ? 'wish-active' : ''}`} onClick={() => toggleWish(selected)}><Bookmark size={17} fill={wished(selected.id) ? 'currentColor' : 'none'}/>{wished(selected.id) ? 'Na liście życzeń' : 'Chcę spróbować'}</button></div>{inBar(selected.id) ? <div className="bar-manager"><div><strong><Check size={16}/> W Twoim barku</strong><label><input type="checkbox" checked={inBar(selected.id)!.opened} onChange={e => setJournal(j => ({...j,bottles:j.bottles.map(b => b.whiskyId === selected.id ? {...b,opened:e.target.checked} : b)}))}/> Mam otwartą butelkę</label></div><div className="quantity"><button aria-label="Zmniejsz liczbę butelek" onClick={() => changeQuantity(selected.id, inBar(selected.id)!.quantity-1)}><Minus size={17}/></button><span aria-label="Liczba butelek">{inBar(selected.id)!.quantity}</span><button aria-label="Zwiększ liczbę butelek" disabled={inBar(selected.id)!.quantity >= 999} onClick={() => changeQuantity(selected.id,inBar(selected.id)!.quantity+1)}><Plus size={17}/></button></div></div> : <button className="button outline full" onClick={() => addBar(selected)}><Plus size={17}/> Dodaj do barku</button>}<div className="review-section"><h3>Twoje degustacje <span>{reviewsFor(selected.id).length}</span></h3>{!reviewsFor(selected.id).length && <p className="muted">Jeszcze nie oceniono. Zapisz pierwszy łyk i swoje wrażenia.</p>}{[...reviewsFor(selected.id)].reverse().map(r => <div className="review-entry" key={r.id}><div className="review-entry-header"><span className="score"><Star size={15} fill="currentColor"/> {formatScore(r.score)}<small>/ 10</small></span><time>{new Date(`${r.date}T12:00:00`).toLocaleDateString('pl-PL')}</time><button className="text-button" onClick={() => {setReviewEdit(r);setRatingWhisky(selected);setSelected(null)}}>Edytuj</button><button className="icon-button" aria-label="Usuń degustację" onClick={() => setConfirm({title:'Usunąć degustację?',text:'Tej zmiany nie można cofnąć.',action:()=>{setJournal(j=>({...j,reviews:j.reviews.filter(x=>x.id!==r.id)}));notify('Usunięto degustację')}})}><Trash2 size={15}/></button></div>{r.note && <p className="review-note">{r.note}</p>}<div className="detail-tags">{r.tags.map(t=><span key={t}>{t}</span>)}</div></div>)}</div>{selected.custom && <button className="danger-link" onClick={() => setConfirm({title:'Usunąć własny wpis whisky?',text:'Zniknie także z barku, listy życzeń i dziennika ocen.',action:()=>{const id=selected.id;setJournal(j=>({...j,custom:j.custom.filter(w=>w.id!==id),bottles:j.bottles.filter(b=>b.whiskyId!==id),wishlist:j.wishlist.filter(x=>x!==id),reviews:j.reviews.filter(r=>r.whiskyId!==id),...(j.barcodeLinks ? {barcodeLinks:j.barcodeLinks.filter(link=>link.whiskyId!==id)} : {})}));setSelected(null);notify('Usunięto własną whisky')}})}><Trash2 size={15}/> Usuń własny wpis</button>}</Modal>}
    {ratingWhisky && <ReviewForm whisky={ratingWhisky} existing={reviewEdit} onClose={() => {setRatingWhisky(null);setReviewEdit(undefined)}} onSave={review => {setJournal(j=>({...j,reviews:reviewEdit?j.reviews.map(r=>r.id===reviewEdit.id?review:r):[...j.reviews,review]}));setRatingWhisky(null);setReviewEdit(undefined);notify(reviewEdit?'Zmieniono degustację':'Zapisano degustację')}}/>}
    {adding && <AddWhisky defaultBrand={pendingBarcode ? '' : tab === 'discover' && brand !== 'custom' ? activeBrand?.name : undefined} all={all} onClose={() => {setAdding(false);setPendingBarcode(null)}} onSave={(w,bar) => {setJournal(j=>({...j,custom:[...j.custom,w],bottles:bar?[...j.bottles,{whiskyId:w.id,quantity:1,opened:false}]:j.bottles,...(pendingBarcode && (j.barcodeLinks?.length ?? 0)<4000 ? {barcodeLinks:[...(j.barcodeLinks??[]).filter(link=>link.code!==pendingBarcode),{code:pendingBarcode,whiskyId:w.id}]} : {})}));setAdding(false);setPendingBarcode(null);notify('Dodano własną whisky')}}/>}
    {confirm && <Modal title={confirm.title} onClose={() => setConfirm(null)} className="confirm-modal"><h2>{confirm.title}</h2><p>{confirm.text}</p><div className="confirm-actions"><button className="button outline" onClick={() => setConfirm(null)}>Anuluj</button><button className="button dark" onClick={()=>{confirm.action();setConfirm(null)}}>Potwierdź</button></div></Modal>}
    {!age && <Modal title="Witaj w Dram" onClose={() => {}} className="age-modal"><div className="age-logo"><GlassWater size={35} strokeWidth={1.3}/></div><h2>Masz ukończone 18 lat?</h2><p>Dram to dziennik whisky dla osób pełnoletnich.</p><button className="button dark full" onClick={()=>{setAge(true);try{localStorage.setItem('dram.age','yes')}catch{/* The gate remains usable without persistent storage. */}}}>Tak, mam 18 lat <ArrowRight size={17}/></button><a className="age-exit" href="https://www.google.com">Nie, wychodzę</a><small>Delektuj się odpowiedzialnie.</small></Modal>}
  </div>
}

function ReviewForm({ whisky, existing, onSave, onClose }: { whisky: Whisky; existing?: Review; onSave: (r:Review)=>void; onClose:()=>void }) {
  const [score,setScore]=useState(existing?.score ?? 7)
  const [tags,setTags]=useState<string[]>(existing?.tags ?? [])
  const [note,setNote]=useState(existing?.note ?? '')
  const [date,setDate]=useState(existing?.date ?? today())
  return <Modal title={existing?'Edytuj degustację':'Nowa degustacja'} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave({id:existing?.id??crypto.randomUUID(),whiskyId:whisky.id,score,note:note.trim(),date,tags})}}><p className="form-overline">{whisky.brand}</p><h2 className="form-whisky-name">{whisky.name}</h2><div className="rating-input"><label htmlFor="score">Jak Ci smakuje?</label><div className="big-score">{formatScore(score)}<small>/ 10</small></div><div className="rating-stars" aria-hidden="true">{[1,2,3,4,5].map(n=><Star key={n} size={24} fill={score>=n*2-1?'currentColor':'none'}/>)}</div><input id="score" aria-label="Twoja ocena" type="range" min="1" max="10" step="0.5" value={score} onChange={e=>setScore(Number(e.target.value))}/><div className="rating-scale"><span>Nie w moim stylu</span><span>Wyjątkowa</span></div></div><fieldset className="tag-field"><legend>Co wyczuwasz? <span>Opcjonalnie</span></legend><div>{tastingTags.map(t=><button type="button" aria-pressed={tags.includes(t)} className={tags.includes(t)?'selected':''} key={t} onClick={()=>setTags(x=>x.includes(t)?x.filter(v=>v!==t):[...x,t])}>{t}</button>)}</div></fieldset><label className="field">Twoje wrażenia <span>Opcjonalnie</span><textarea maxLength={3000} placeholder="Zapach, smak, finisz… albo po prostu: z kim i kiedy?" rows={4} value={note} onChange={e=>setNote(e.target.value)}/></label><label className="field">Data degustacji<input type="date" value={date} required max={today()} min="1900-01-01" onChange={e=>setDate(e.target.value)}/></label><button type="submit" className="button dark full"><Check size={17}/> Zapisz degustację</button></form></Modal>
}
function AddWhisky({ all, onSave, onClose, defaultBrand = 'Johnnie Walker' }: { defaultBrand?:string;all:Whisky[];onSave:(w:Whisky,bar:boolean)=>void;onClose:()=>void }) {
  const [image,setImage]=useState(''); const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function photo(file:File) {
    setError('')
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {setError('Wybierz zdjęcie JPG, PNG lub WebP.');return}
    if(file.size>10_000_000){setError('Zdjęcie może mieć maksymalnie 10 MB.');return}
    setBusy(true)
    try {const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const factor=Math.min(1,800/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*factor);canvas.height=Math.round(bitmap.height*factor);const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);setImage(canvas.toDataURL('image/jpeg',0.8));bitmap.close()}catch{setError('Nie udało się odczytać zdjęcia. Spróbuj innego pliku.')}finally{setBusy(false)}
  }
  function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');const f=new FormData(e.currentTarget);const name=String(f.get('name')).trim();const brand=String(f.get('brand')).trim()
    if(!name||!brand){setError('Podaj markę i nazwę whisky.');return}
    if(all.some(w=>`${w.brand} ${w.name}`.toLowerCase()===`${brand} ${name}`.toLowerCase())){setError('Ta whisky jest już w katalogu. Znajdziesz ją w wyszukiwarce.');return}
    const url=String(f.get('imageUrl')||'').trim();if(url&&!safeUrl(url)){setError('Adres zdjęcia musi zaczynać się od https://.');return}
    onSave({id:`custom-${crypto.randomUUID()}`,name,brand,series:String(f.get('series')||'Własna kolekcja').trim(),category:'Klasyka',abv:f.get('abv')?Number(f.get('abv')):null,age:f.get('age')?Number(f.get('age')):null,volume:f.get('volume')?Number(f.get('volume')):null,country:String(f.get('country')).trim()||'Niepodane',description:String(f.get('description')||'').trim(),image:image||url,source:'',imageSource:image?'':url,tags:[],custom:true},f.get('bar')==='on')
  }
  return <Modal title="Dodaj własną whisky" onClose={onClose}><h2>Dodaj whisky</h2><p className="muted">Nie ma jej w katalogu? Dodaj whisky do swojego dziennika.</p><form onSubmit={submit}><div className="form-two"><label className="field">Marka<input name="brand" defaultValue={defaultBrand} required maxLength={100}/></label><label className="field">Nazwa / edycja<input name="name" required maxLength={150} placeholder="np. Black Label"/></label></div><div className="form-three"><label className="field">Moc (%)<input name="abv" type="number" min="0.1" max="100" step="0.1" placeholder="40"/></label><label className="field">Wiek (lata)<input name="age" type="number" min="1" max="100" step="1" placeholder="NAS"/></label><label className="field">Pojemność (ml)<input name="volume" type="number" min="1" max="10000" step="1" placeholder="700"/></label></div><label className="field">Kraj<input name="country" defaultValue="Szkocja" maxLength={100}/></label><label className="field">Notatka <span>Opcjonalnie</span><textarea name="description" rows={2} maxLength={3000} placeholder="Co wyróżnia tę butelkę?"/></label><label className="photo-upload">{image?<img src={image} alt="Wybrane zdjęcie whisky"/>:<Upload size={24}/>}<strong>{busy?'Przetwarzanie…':image?'Zmień zdjęcie':'Dodaj prawdziwe zdjęcie butelki'}</strong><span>JPG, PNG lub WebP · do 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Dodaj zdjęcie whisky" onChange={e=>{if(e.target.files?.[0])void photo(e.target.files[0])}}/></label>{image?<button className="text-button photo-remove" type="button" onClick={()=>setImage('')}>Usuń zdjęcie</button>:<label className="field">Lub adres zdjęcia <span>Opcjonalnie</span><input name="imageUrl" type="url" placeholder="https://…"/></label>}<label className="checkbox-field"><input type="checkbox" name="bar" defaultChecked/> Dodaj od razu do mojego barku</label>{error&&<p role="alert" className="form-error">{error}</p>}<button type="submit" className="button dark full" disabled={busy}><Plus size={17}/> Dodaj whisky</button></form></Modal>
}
