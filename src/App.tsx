import CellarInstances, {CollectionCosts} from './components/CellarInstances'
import { JournalDraftConflict } from './journal-store'
import { ageStatus, typeNames, typeOf } from './classification'
import { WHISKY_TYPES } from './model'
import type { WhiskyType } from './model'
import { useJournal } from './useJournal'
import BackupControls, { downloadJournal } from './components/BackupControls'
import { getPreferences, subscribePreferences, updatePreferences } from './preferences'
import { locale, interpolate, t, t as translateTag } from './i18n'
import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Bookmark, Check, ChevronDown, ChevronRight, Compass, Library, ListFilter, Minus, Plus, ScanBarcode, Star, Settings, Upload, X } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import barcodeData from './barcodes.json'
import { addBarcodeBottle } from './barcode'
import type { BarcodeEntry } from './barcode'
import { brands, brandOf, brandKey } from './brands'
import type { BrandId } from './brands'
import catalogData from './catalog.json' with {type:'json'}
import priceData from './prices.json'
import Discovery from './components/Discovery'
import WhiskyCard from './components/WhiskyCard'
import WhiskyDetails from './components/WhiskyDetails'
import ReviewJournal from './components/ReviewJournal'
import { counted, Modal, Photo, photoBackground, SearchField, Wordmark } from './components/Primitives'
import { regionalPrices, cellarValue, comparePrices, regionalMoney, wishlistValue } from './pricing'
import type { PriceQuote } from './pricing'
import { average, bottleWithQuantity, formatScore, matchesWhisky, safeUrl, today } from './model'
import type { Journal, Review, Whisky } from './model'

const catalog = catalogData as Whisky[]
const catalogIds = catalog.map(w => w.id)
const basePrices = priceData as Record<string, PriceQuote>
const categories = ['Wszystkie', 'Klasyka', 'Edycja specjalna', 'Kolekcjonerska'] as const
const tastingTags = ['Dym', 'Torf', 'Miód', 'Wanilia', 'Owoce', 'Cytrusy', 'Przyprawy', 'Dąb', 'Czekolada', 'Karmel', 'Orzechy', 'Suszone owoce', 'Sherry', 'Kawa']
type Tab = 'discover' | 'bar' | 'wishlist' | 'reviews'
const tabs: { id: Tab; name: string; mobile: string; icon: typeof Compass }[] = [
  { id: 'discover', name: 'Odkrywaj', mobile: 'Odkrywaj', icon: Compass },
  { id: 'bar', name: 'Mój barek', mobile: 'Barek', icon: Library },
  { id: 'wishlist', name: 'Lista życzeń', mobile: 'Życzenia', icon: Bookmark },
  { id: 'reviews', name: 'Moje oceny', mobile: 'Oceny', icon: Star },
]
export default function App() {
  const preferences = useSyncExternalStore(subscribePreferences, getPreferences)
  const prices = useMemo(() => regionalPrices(basePrices, preferences.region), [preferences.region])
  const [instancesOpen,setInstancesOpen]=useState(false)
  const [instanceRelease,setInstanceRelease]=useState<string|undefined>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsError, setSettingsError] = useState(false)
  useEffect(() => { document.documentElement.lang = preferences.language }, [preferences.language])
  const { journal, collection, initializing, error: storageError, blocked: readBlocked, draft, pending: pendingWrites, store } = useJournal(catalogIds)
  const setJournal = store.update
  const [tab, setTab] = useState<Tab>('discover')
  const [brand, setBrand] = useState<BrandId | 'custom' | null>(null)
  const activeBrand = brand === 'custom' ? {name: 'Własne wpisy', logo: ''} : brands.find(b => b.id === brand)
  const inSelectedBrand = (w: Whisky) => !brand || (brand === 'custom' ? Boolean(w.custom) : brandOf(w) === brand)
  const [otherBrand,setOtherBrand] = useState('all')
  const otherBrands = [...new Map(catalog.filter(w=>brandOf(w)==='other').map(w=>[brandKey(w.brand),w.brand])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pl'))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('Wszystkie')
  const [whiskyType,setWhiskyType] = useState('all')
  const [ageFilter,setAgeFilter] = useState('all')
  const [ageYears,setAgeYears] = useState('all')
  const [sort, setSort] = useState('price-asc')
  const [stockFilter, setStockFilter] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Whisky | null>(null)
  const [ratingWhisky, setRatingWhisky] = useState<Whisky | null>(null)
  const [adding, setAdding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void | Promise<void> } | null>(null)
  const [confirmBusy,setConfirmBusy]=useState(false)
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(1)
  const [reviewEdit, setReviewEdit] = useState<Review | undefined>()
  const [age, setAge] = useState(() => { try { return localStorage.getItem('dram.age') === 'yes' } catch { return false } })
  const all = useMemo(() => [...catalog, ...journal.custom], [journal.custom])
  useEffect(() => {if(selected){const current=all.find(w=>w.id===selected.id);if(current!==selected)setSelected(current??null)}},[all,selected])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3300); return () => clearTimeout(t) }, [toast])
  useEffect(() => { setPage(1) }, [tab, brand, query, category, sort, stockFilter, whiskyType, ageFilter, ageYears, otherBrand])
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [tab, brand])
  const notify = (message: string) => setToast(message)
  const go = (next: Tab) => { setTab(next); if (next === 'discover') setBrand(null); setQuery(''); setOtherBrand('all'); setCategory('Wszystkie'); setWhiskyType('all'); setAgeFilter('all'); setAgeYears('all'); setSort(next === 'reviews' ? 'recent' : 'price-asc'); setStockFilter('all'); setFiltersOpen(false); window.scrollTo(0, 0) }
  const reviewsFor = (id: string) => journal.reviews.filter(r => r.whiskyId === id)
  const inBar = (id: string) => journal.bottles.find(b => b.whiskyId === id)
  const wished = (id: string) => journal.wishlist.includes(id)
  async function toggleWish(w: Whisky) {
    const saved = await setJournal(j => ({ ...j, wishlist: j.wishlist.includes(w.id) ? j.wishlist.filter(id => id !== w.id) : [...j.wishlist, w.id] }))
    if (saved) notify(store.getSnapshot().journal.wishlist.includes(w.id) ? 'Dodano do listy życzeń' : 'Usunięto z listy życzeń')
  }
  async function addBar(w: Whisky) {
    if (inBar(w.id)) { setSelected(w); return }
    const saved = await setJournal(j => j.bottles.some(b=>b.whiskyId===w.id) ? j : ({ ...j, bottles: [...j.bottles, { whiskyId: w.id, quantity: 1, openedCount: 0 }], wishlist: j.wishlist.filter(id => id !== w.id) }))
    if (saved) notify('Dodano butelkę do barku')
  }
  function confirmJournal(title: string, text: string, recipe: (j:Journal)=>Journal, message: string, after?:()=>void) {
    const token = store.getToken()
    setConfirm({title,text,action:async()=>{if(await store.update(recipe,{expectedRaw:token})){after?.();notify(message)}}})
  }
  function changeQuantity(id: string, quantity: number) {
    if (quantity < 1) {
      confirmJournal('Usunąć whisky z barku?','Twoje oceny i degustacje zostaną zachowane.',j=>({...j,bottles:j.bottles.filter(b=>b.whiskyId!==id)}),'Usunięto z barku');return
    }
    const delta = quantity - (inBar(id)?.quantity ?? 0)
    void setJournal(j => ({ ...j, bottles: j.bottles.map(b => b.whiskyId === id ? bottleWithQuantity(b,Math.max(1,Math.min(999,b.quantity+delta))) : b) }))
  }
  const displayed = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pl')
    const score = (id: string) => average(journal.reviews.filter(r => r.whiskyId === id)) ?? -1
    return all.filter(w => (tab !== 'discover' || inSelectedBrand(w)) && (tab === 'discover' || (tab === 'bar' && journal.bottles.some(b => b.whiskyId === w.id)) || (tab === 'wishlist' && journal.wishlist.includes(w.id)) || (tab === 'reviews' && journal.reviews.some(r => r.whiskyId === w.id))) && (tab !== 'bar' || stockFilter === 'all' || journal.bottles.some(b => b.whiskyId === w.id && (stockFilter === 'opened' ? b.openedCount > 0 : b.quantity > b.openedCount))) && (category === 'Wszystkie' || w.category === category) && (whiskyType === 'all' || typeOf(w) === whiskyType) && (ageFilter === 'all' || ageStatus(w) === ageFilter) && (ageYears === 'all' || w.age === Number(ageYears)) && (tab !== 'discover' || brand !== 'other' || otherBrand === 'all' || brandKey(w.brand) === otherBrand) && matchesWhisky(w, q))
      .sort((a,b) => sort === 'price-asc' ? comparePrices(prices[a.id], prices[b.id]) : sort === 'price-desc' ? comparePrices(prices[a.id], prices[b.id], true) : sort === 'name' ? `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, preferences.language) : sort === 'rating' ? score(b.id) - score(a.id) : sort === 'age' ? (b.age ?? -1) - (a.age ?? -1) : 0)
  }, [all, tab, brand, journal, category, query, sort, stockFilter, prices, preferences.language, whiskyType, ageFilter, ageYears, otherBrand])
  const valuation = cellarValue(journal.bottles, prices)
  const totalBottles = journal.bottles.reduce((s, b) => s + b.quantity, 0)
  function exportData(raw = false) {
    try {
      store.reload()
      downloadJournal(raw || readBlocked ? store.getRaw() ?? '{}' : store.getSnapshot().journal)
      notify('Pobrano zapis dziennika')
    } catch { notify('Przeglądarka blokuje odczyt danych.') }
  }
  const wishlistValuation = wishlistValue(journal.wishlist, prices)
  const filteredReviews = journal.reviews.filter(r => displayed.some(w => w.id === r.whiskyId)).reverse().sort((a, b) => sort === 'recent' ? b.date.localeCompare(a.date) : displayed.findIndex(w => w.id === a.whiskyId) - displayed.findIndex(w => w.id === b.whiskyId) || b.date.localeCompare(a.date))
  const resultCount = tab === 'reviews' ? filteredReviews.length : displayed.length
  const headings = {
    discover: [activeBrand?.name ?? 'Odkrywaj', 'Katalog whisky'],
    bar: ['Mój barek', interpolate('{0} whisky · {1}', journal.bottles.length, counted(totalBottles, 'butelka', 'butelki', 'butelek'))],
    wishlist: ['Lista życzeń', 'Do spróbowania i do kolekcji'],
    reviews: ['Dziennik degustacji', 'Twoje oceny i notatki'],
  }[tab]
  const openReview = (w: Whisky, review?: Review) => { setReviewEdit(review); setRatingWhisky(w); setSelected(null) }
  const changeOpened = (id: string, count: number) => {
    const delta = count - (inBar(id)?.openedCount ?? 0)
    void setJournal(j => ({...j,bottles:j.bottles.map(b => b.whiskyId === id ? {...b,openedCount:Math.max(0,Math.min(b.openedCount+delta,b.quantity))} : b)}))
  }
  const chooseBrand = (id: BrandId | 'custom') => { setBrand(id); setQuery(''); setOtherBrand('all'); setCategory('Wszystkie'); setWhiskyType('all'); setAgeFilter('all'); setAgeYears('all'); setSort('price-asc'); setFiltersOpen(false); window.scrollTo(0,0) }
  const catalogResults = resultCount ? <>
    {tab === 'reviews' ? <ReviewJournal reviews={filteredReviews.slice(0, page * 24)} all={all} onOpen={setSelected} onEdit={openReview}/> : <div className="whisky-grid">{displayed.slice(0, page * 24).map(w => <WhiskyCard key={w.id} whisky={w} quote={prices[w.id]} bottle={inBar(w.id)} wished={wished(w.id)} inCollection={tab === 'bar'} onOpen={() => setSelected(w)} onAdd={() => addBar(w)} onQuantity={n => changeQuantity(w.id, n)}/>)}</div>}
    {resultCount > page * 24 && <div className="load-more"><button className="button outline" onClick={() => setPage(p => p + 1)}>{tab === 'reviews' ? t("Pokaż kolejne degustacje") : t("Pokaż kolejne whisky")} <ChevronDown size={18}/></button><p>{t("Pokazano")} {Math.min(page * 24, resultCount)}  {t("z")} {resultCount}</p></div>}
  </> : <div className="empty-state"><p className="page-kicker">{query || category !== 'Wszystkie' || stockFilter !== 'all' || whiskyType !== 'all' || ageFilter !== 'all' || ageYears !== 'all' ? t("Wyniki wyszukiwania") : t("Twój dziennik")}</p><h3>{query || category !== 'Wszystkie' || stockFilter !== 'all' || whiskyType !== 'all' || ageFilter !== 'all' || ageYears !== 'all' ? t("Nie znaleźliśmy takiej whisky") : tab === 'bar' ? t("Twój barek jest pusty") : tab === 'wishlist' ? t("Lista życzeń jest pusta") : t("Nie masz jeszcze ocen")}</h3><p>{query || category !== 'Wszystkie' || stockFilter !== 'all' || whiskyType !== 'all' || ageFilter !== 'all' || ageYears !== 'all' ? t("Spróbuj innej nazwy lub wyczyść filtry.") : tab === 'bar' ? t("Zeskanuj kod swojej butelki lub znajdź ją w katalogu.") : tab === 'wishlist' ? t("Zapisz butelkę, którą chcesz mieć lub spróbować. Dodasz ją w szczegółach whisky.") : t("Otwórz whisky i zapisz ocenę, aromaty oraz swoje wrażenia.")}</p><button className="button outline" onClick={() => { if (query || category !== 'Wszystkie' || stockFilter !== 'all' || whiskyType !== 'all' || ageFilter !== 'all' || ageYears !== 'all') {setQuery(''); setOtherBrand('all'); setCategory('Wszystkie'); setStockFilter('all'); setWhiskyType('all'); setAgeFilter('all'); setAgeYears('all')} else go('discover') }}>{query || category !== 'Wszystkie' || stockFilter !== 'all' || whiskyType !== 'all' || ageFilter !== 'all' || ageYears !== 'all' ? t("Wyczyść filtry") : t("Przeglądaj whisky")} <ArrowRight size={17}/></button></div>
  if(initializing)return <div className="app-initializing" role="status"><Wordmark/><p>{t('Przygotowuję bezpiecznie kolekcję…')}</p></div>
  return <div className="app-shell">
    <a className="skip-link" href="#main">{t("Przejdź do treści")}</a>
    <aside className="sidebar"><button className="brand" aria-label={t("Dram. Dziennik whisky — strona główna")} onClick={() => go('discover')}><Wordmark/></button><nav aria-label={t("Główna nawigacja")}>{tabs.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => go(item.id)} aria-current={tab === item.id ? 'page' : undefined}><item.icon size={20}/><span>{t(item.name)}</span>{item.id === 'bar' && journal.bottles.length > 0 && <small>{journal.bottles.length}</small>}{item.id === 'wishlist' && journal.wishlist.length > 0 && <small>{journal.wishlist.length}</small>}</button>)}</nav></aside>
    <div className="main-shell"><header className="topbar"><button className="mobile-brand" aria-label={t("Dram — strona główna")} onClick={() => go('discover')}><Wordmark compact/></button><div className="breadcrumb">{t("Dziennik")} <ChevronRight size={14}/><strong>{t(tabs.find(item => item.id === tab)?.name ?? '')}</strong></div><div className="topbar-actions">{pendingWrites > 0 && <span className="save-status" role="status">{t('Zapisywanie…')}</span>}<button className="icon-button" aria-label={t("Ustawienia")} onClick={() => setSettingsOpen(true)}><Settings size={21}/></button><button className="icon-button scan-top" aria-label={t("Skanuj kod kreskowy")} title={t("Skanuj kod kreskowy")} onClick={() => setScanning(true)}><ScanBarcode size={23}/></button></div></header>
      <main id="main" className="main-content">{storageError && <div role="alert" className="storage-alert">{t(storageError)}<button onClick={() => exportData(true)}>{t("Pobierz zapis do odzyskania")}</button>{draft && <button onClick={()=>downloadJournal(draft,'niezapisane')}>{t('Pobierz niezapisane zmiany')}</button>}{!readBlocked && <button onClick={store.clearError}>{t('Zamknij komunikat')}</button>}</div>}
        {tab === 'discover' && !brand ? <Discovery journal={journal} query={query} onQuery={setQuery} onBrand={chooseBrand} onGo={go} onCreate={() => setAdding(true)} results={catalogResults} resultCount={displayed.length}/> : <>{tab === 'discover' && <button className="back-brands" onClick={() => go('discover')}><ChevronRight size={16}/>  {t("Wszystkie marki")}</button>}<div className="page-intro"><div><p className="page-kicker">{t(headings[1])}</p><h1>{t(headings[0])}<span className="count">{tab === 'discover' ? all.filter(w => inSelectedBrand(w)).length : resultCount}</span></h1></div></div>
        {tab === 'bar' && <section className="cellar-value" aria-label={t("Wartość barku")}><div><p>{t("Wartość barku")}</p><strong>{regionalMoney(valuation.amount)}</strong><p className="valuation-definition">{t('Orientacyjne ceny katalogowe całych posiadanych butelek. To nie jest wartość sprzedaży ani wycena pozostałego płynu.')}</p><button className="button outline" onClick={()=>{setInstanceRelease(undefined);setInstancesOpen(true)}}>{t('Zarządzaj egzemplarzami')}</button>{valuation.missing > 0 && <small>{t("Bez wyceny:")} {counted(valuation.missing, 'butelka', 'butelki', 'butelek')}</small>}</div></section>}
        {tab === 'wishlist' && <section className="wishlist-value" aria-label={t("Wartość listy życzeń")}><p>{t("Wartość listy życzeń")}</p><strong>{regionalMoney(wishlistValuation.amount)}</strong>{wishlistValuation.missing > 0 && <small>{t("Bez wyceny:")} {counted(wishlistValuation.missing, 'pozycja', 'pozycje', 'pozycji')}</small>}<span>{t("Orientacyjnie · po jednej butelce każdej whisky")}</span></section>}

        {tab==='bar'&&<CollectionCosts journal={collection} prices={prices}/>}
        <section className="catalog-section" aria-label={t(headings[0])}>
          {tab === 'discover' && !all.some(w => inSelectedBrand(w)) ? <div className={`empty-state brand-empty brand-${brand}`}>{activeBrand?.logo && <img src={`${import.meta.env.BASE_URL}brands/${activeBrand.logo}`} alt={`Logo ${activeBrand.name}`}/>}<h2>{brand === 'custom' ? t("Nie masz własnych wpisów") : t("Katalog w przygotowaniu")}</h2><p>{brand === 'custom' ? t("Dodaj butelkę, której nie ma w katalogu.") : `Butelki ${activeBrand?.name} pojawią się tutaj w kolejnej aktualizacji.`}</p><button className="button outline" onClick={() => go('discover')}>{t("Wybierz inną markę")}</button></div> : <><div className="catalog-toolbar"><SearchField value={query} onChange={setQuery}/><button className={`filter-toggle ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="catalog-filters"><ListFilter size={17}/><span>{t("Filtry")}</span>{(category !== 'Wszystkie' || whiskyType !== 'all' || ageFilter !== 'all' || ageYears !== 'all' || stockFilter !== 'all' || otherBrand !== 'all') && <i/>}</button><label className="sort"><span>{t("Sortuj:")}</span><select aria-label={t("Sortuj whisky")} value={sort} onChange={e => setSort(e.target.value)}>{tab === 'reviews' && <option value="recent">{t("Od najnowszych")}</option>}<option value="price-asc">{t("Cena: od najniższej")}</option><option value="price-desc">{t("Cena: od najwyższej")}</option><option value="name">{t("Nazwa A–Z")}</option><option value="rating">{t("Moja najwyższa ocena")}</option><option value="age">{t("Wiek malejąco")}</option></select><ChevronDown size={14}/></label></div>
          <div id="catalog-filters" className="category-row" hidden={!filtersOpen}>{tab === 'bar' && <div className="collection-switch" role="group" aria-label={t("Stan butelek")}>{[['all','Wszystkie'],['opened','Otwarte'],['unopened','Nieotwarte']].map(([id,label]) => <button key={id} aria-pressed={stockFilter === id} onClick={() => setStockFilter(id)}>{t(label)}</button>)}</div>}<div className="category-tabs" role="group" aria-label={t("Rodzaj edycji")}>{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'active' : ''} aria-pressed={category === c}>{c === 'Wszystkie' ? t("Wszystkie whisky") : t(c)}</button>)}</div><div className="type-filters">{tab === 'discover' && brand === 'other' && <label className="field">{t('Marka')}<select aria-label={t('Marka')} value={otherBrand} onChange={e=>setOtherBrand(e.target.value)}><option value="all">{t('Wszystkie marki')}</option>{otherBrands.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>}<label className="field">{t('Typ whisky')}<select aria-label={t('Typ whisky')} value={whiskyType} onChange={e=>setWhiskyType(e.target.value)}><option value="all">{t('Wszystkie typy')}</option>{WHISKY_TYPES.map(type=><option key={type} value={type}>{t(typeNames[type])}</option>)}</select></label><label className="field">{t('Informacja o wieku')}<select aria-label={t('Informacja o wieku')} value={ageFilter} onChange={e=>{setAgeFilter(e.target.value);if(e.target.value!=='all' && e.target.value!=='stated')setAgeYears('all')}}><option value="all">{t('Wszystkie')}</option><option value="stated">{t('Wiek określony')}</option><option value="nas">NAS</option><option value="unknown">{t('Brak danych')}</option></select></label><label className="field">{t('Wiek w latach')}<select aria-label={t('Wiek w latach')} value={ageYears} onChange={e=>{setAgeYears(e.target.value);if(e.target.value!=='all')setAgeFilter('stated')}}><option value="all">{t('Każdy wiek')}</option>{[...new Set(all.flatMap(w=>w.age===null?[]:[w.age]))].sort((a,b)=>a-b).map(years=><option key={years} value={years}>{counted(years,'rok','lata','lat')}</option>)}</select></label></div></div>
          {catalogResults}
        </>}</section></>}
      </main></div>
    <nav className="bottom-nav" aria-label={t("Nawigacja mobilna")}>{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => go(item.id)} aria-current={tab === item.id ? 'page' : undefined}><item.icon size={21} strokeWidth={tab === item.id ? 2 : 1.6}/><span>{t(item.mobile)}</span>{item.id === 'wishlist' && journal.wishlist.length > 0 && <i/>}</button>)}</nav>
    {toast && <div className="toast" role="status"><Check size={18}/><span>{t(toast)}</span><button onClick={() => setToast('')} aria-label={t("Zamknij powiadomienie")}><X size={16}/></button></div>}
    {settingsOpen && <Modal title={t('Ustawienia')} onClose={() => setSettingsOpen(false)} className="preferences-modal"><h2>{t('Ustawienia')}</h2><p className="muted">{t('Ustawienia działają niezależnie: język nie zmienia regionu.')}</p><label className="field">{t('Język')}<select aria-label={t("Język")} value={preferences.language} onChange={e => setSettingsError(!updatePreferences({language: e.target.value as 'pl' | 'en'}))}><option value="pl">Polski</option><option value="en">English</option></select></label><label className="field">{t('Region')}<select aria-label={t("Region")} value={preferences.region} onChange={e => setSettingsError(!updatePreferences({region: e.target.value as 'PL' | 'NL'}))}><option value="PL">{t('Polska')} · PLN</option><option value="NL">{t('Holandia')} · EUR</option></select></label>{preferences.region === 'PL' && <p className="muted">{t("Ceny zagraniczne przeliczamy na PLN. Kurs i źródło znajdziesz przy cenie butelki.")}</p>}<BackupControls journal={collection} catalogIds={catalogIds} getToken={store.getToken} onExport={()=>exportData()} onImport={async (data, token)=>{const saved=await store.replace(data,token);if(saved){setSelected(null);setRatingWhisky(null);setAdding(false);setScanning(false);notify('Przywrócono dziennik')}return saved}}/>{settingsError && <p role="alert">{t('Nie udało się zapisać ustawień. Zmiana działa do zamknięcia strony.')}</p>}</Modal>}
    {scanning && <Modal title={t("Skaner kodów kreskowych")} onClose={() => setScanning(false)} className="barcode-modal"><BarcodeScanner renderPhoto={w => <div className="barcode-photo" style={photoBackground(w)}><Photo whisky={w} eager/></div>} all={all} entries={barcodeData as BarcodeEntry[]} links={journal.barcodeLinks ?? []} bottles={journal.bottles} onCreate={code => { setScanning(false); setPendingBarcode(code); setAdding(true) }} onAdd={async (w, code, remember) => {
      // Validate before closing the scanner so limits remain visible and recoverable.
      addBarcodeBottle(journal, w, code, remember)
      if (!await setJournal(j => addBarcodeBottle(j, w, code, remember))) throw Error(store.getSnapshot().error)
      setScanning(false); notify('Dodano butelkę do barku')
    }}/></Modal>}
    {instancesOpen&&<CellarInstances getError={()=>store.getSnapshot().error} journal={collection} all={all} prices={prices} initialWhiskyId={instanceRelease} onUpdate={store.updateCollection} onClose={()=>setInstancesOpen(false)}/>}
    {selected && <WhiskyDetails onInstances={()=>{setInstanceRelease(selected.id);setSelected(null);setInstancesOpen(true)}} instanceCount={collection.ownedBottles.filter(b=>b.whiskyId===selected.id).length} whisky={selected} quote={prices[selected.id]} reviews={reviewsFor(selected.id)} bottle={inBar(selected.id)} wished={wished(selected.id)} onClose={() => setSelected(null)} onWish={() => toggleWish(selected)} onRate={() => openReview(selected)} onAdd={() => addBar(selected)} onQuantity={n => changeQuantity(selected.id, n)} onOpened={value => changeOpened(selected.id, value)} onEditReview={r => openReview(selected, r)} onDeleteReview={r => confirmJournal('Usunąć degustację?','Ocena i notatka zostaną usunięte.',j=>({...j,reviews:j.reviews.filter(x=>x.id!==r.id)}),'Usunięto degustację')} onDeleteCustom={() => {
      const id=selected.id
      confirmJournal('Usunąć własny wpis whisky?','Znikną także jej egzemplarze, dokumenty, historia, życzenia i oceny. Przed usunięciem możesz pobrać pełną kopię w ustawieniach.',j=>({...j,custom:j.custom.filter(w=>w.id!==id),bottles:j.bottles.filter(b=>b.whiskyId!==id),wishlist:j.wishlist.filter(x=>x!==id),reviews:j.reviews.filter(r=>r.whiskyId!==id),...(j.barcodeLinks ? {barcodeLinks:j.barcodeLinks.filter(link=>link.whiskyId!==id)} : {})}),'Usunięto własny wpis',()=>setSelected(null))
    }}/>}
    {ratingWhisky && <ReviewForm whisky={ratingWhisky} existing={reviewEdit} onClose={() => {setRatingWhisky(null);setReviewEdit(undefined)}} onSave={async review => {
      const saved = await setJournal(j => {
        if (ratingWhisky.custom && !j.custom.some(w=>w.id===ratingWhisky.id)) throw new JournalDraftConflict('Tę whisky usunięto w innej karcie. Twoja notatka jest w kopii niezapisanych zmian.',{...j,custom:[...j.custom,ratingWhisky],reviews:[...j.reviews.filter(r=>r.id!==review.id),review]})
        if (reviewEdit && JSON.stringify(j.reviews.find(r=>r.id===reviewEdit.id)) !== JSON.stringify(reviewEdit)) throw new JournalDraftConflict('Ta degustacja zmieniła się w innej karcie. Zachowaj swoją notatkę i otwórz aktualny wpis ponownie.', {...j,reviews:[...j.reviews.filter(r=>r.id!==reviewEdit.id),review]})
        return {...j,reviews:reviewEdit?j.reviews.map(r=>r.id===reviewEdit.id?review:r):[...j.reviews,review]}
      })
      if(saved){setRatingWhisky(null);setReviewEdit(undefined);notify(reviewEdit?'Zmieniono degustację':'Zapisano degustację')}
      return saved
    }}/>}
    {adding && <AddWhisky defaultBrand={pendingBarcode || brand === 'other' ? '' : tab === 'discover' && brand !== 'custom' ? activeBrand?.name : undefined} all={all} onClose={() => {setAdding(false);setPendingBarcode(null)}} onSave={async (w,bar) => {const saved=await setJournal(j=>({...j,custom:[...j.custom,w],bottles:bar?[...j.bottles,{whiskyId:w.id,quantity:1,openedCount:0}]:j.bottles,...(pendingBarcode && (j.barcodeLinks?.length ?? 0)<4000 ? {barcodeLinks:[...(j.barcodeLinks??[]).filter(link=>link.code!==pendingBarcode),{code:pendingBarcode,whiskyId:w.id}]} : {})}));if(saved){setAdding(false);setPendingBarcode(null);notify('Dodano własną whisky')}return saved}}/>}
    {confirm && <Modal title={confirm.title} onClose={() => setConfirm(null)} className="confirm-modal"><h2>{t(confirm.title)}</h2><p>{t(confirm.text)}</p><div className="confirm-actions"><button className="button outline" onClick={() => setConfirm(null)}>{t("Anuluj")}</button><button className="button dark" disabled={confirmBusy} onClick={async()=>{if(confirmBusy)return;setConfirmBusy(true);await confirm.action();setConfirmBusy(false);setConfirm(null)}}>{t("Potwierdź")}</button></div></Modal>}
    {!age && <Modal title={t("Witaj w Dram")} onClose={() => {}} className="age-modal"><div className="age-logo"><Wordmark compact/></div><h2>{t("Masz ukończone 18 lat?")}</h2><p>{t("Dram to dziennik whisky dla osób pełnoletnich.")}</p><button className="button dark full" onClick={()=>{setAge(true);try{localStorage.setItem('dram.age','yes')}catch{/* The gate remains usable without persistent storage. */}}}>{t("Tak, mam 18 lat")} <ArrowRight size={17}/></button><a className="age-exit" href="https://www.google.com">{t("Nie, wychodzę")}</a><small>{t("Delektuj się odpowiedzialnie.")}</small></Modal>}
  </div>
}

function ReviewForm({ whisky, existing, onSave, onClose }: { whisky: Whisky; existing?: Review; onSave: (r:Review)=>Promise<boolean>; onClose:()=>void }) {
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('')
  const [score,setScore]=useState(existing?.score ?? 7)
  const [tags,setTags]=useState<string[]>(existing?.tags ?? [])
  const [note,setNote]=useState(existing?.note ?? '')
  const [date,setDate]=useState(existing?.date ?? today())
  return <Modal title={existing?t("Edytuj degustację"):t("Nowa degustacja")} onClose={onClose}><form onSubmit={async e=>{e.preventDefault();if(saving)return;setSaving(true);const saved=await onSave({id:existing?.id??crypto.randomUUID(),whiskyId:whisky.id,score,note:note.trim(),date,tags});setSaving(false);if(!saved)setSaveError('Dziennik zmienił się lub zapis się nie powiódł. Twoja notatka pozostaje w formularzu.')}}><p className="form-overline">{whisky.brand}</p><h2 className="form-whisky-name">{whisky.name}</h2><div className="rating-input"><label htmlFor="score">{t("Jak Ci smakuje?")}</label><div className="rating-stepper"><button type="button" className="icon-button" aria-label={t("Obniż ocenę")} disabled={score <= 1} onClick={() => setScore(x => Math.max(1,x-.5))}><Minus size={20}/></button><output htmlFor="score" className="big-score" aria-live="polite">{formatScore(score, locale())}<small>/ 10</small></output><button type="button" className="icon-button" aria-label={t("Podwyższ ocenę")} disabled={score >= 10} onClick={() => setScore(x => Math.min(10,x+.5))}><Plus size={20}/></button></div><input id="score" aria-label={t("Twoja ocena")} type="range" min="1" max="10" step="0.5" value={score} onChange={e=>setScore(Number(e.target.value))}/><div className="rating-scale"><span>{t("Nie w moim stylu")}</span><span>{t("Wyjątkowa")}</span></div></div><fieldset className="tag-field"><legend>{t("Co wyczuwasz?")} <span>{t("Opcjonalnie")}</span></legend><div>{tastingTags.map(t=><button type="button" aria-pressed={tags.includes(t)} className={tags.includes(t)?'selected':''} key={t} onClick={()=>setTags(x=>x.includes(t)?x.filter(v=>v!==t):[...x,t])}>{translateTag(t)}</button>)}</div></fieldset><label className="field">{t("Twoje wrażenia")} <span>{t("Opcjonalnie")}</span><textarea maxLength={3000} placeholder={t("Zapach, smak, finisz. Co chcesz zapamiętać?")} rows={4} value={note} onChange={e=>setNote(e.target.value)}/></label><label className="field">{t("Data degustacji")}<input type="date" value={date} required max={today()} min="1900-01-01" onChange={e=>setDate(e.target.value)}/></label><>{saveError && <p role="alert" className="form-error">{t(saveError)}</p>}</><button type="submit" disabled={saving} className="button dark full"><Check size={17}/>  {t("Zapisz degustację")}</button></form></Modal>
}
function AddWhisky({ all, onSave, onClose, defaultBrand = 'Johnnie Walker' }: { defaultBrand?:string;all:Whisky[];onSave:(w:Whisky,bar:boolean)=>Promise<boolean>;onClose:()=>void }) {
  const [image,setImage]=useState(''); const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function photo(file:File) {
    setError('')
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {setError('Wybierz zdjęcie JPG, PNG lub WebP.');return}
    if(file.size>10_000_000){setError('Zdjęcie może mieć maksymalnie 10 MB.');return}
    setBusy(true)
    try {const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const factor=Math.min(1,800/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*factor);canvas.height=Math.round(bitmap.height*factor);const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);setImage(canvas.toDataURL('image/jpeg',0.8));bitmap.close()}catch{setError('Nie udało się odczytać zdjęcia. Spróbuj innego pliku.')}finally{setBusy(false)}
  }
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');const f=new FormData(e.currentTarget);const name=String(f.get('name')).trim();const brand=String(f.get('brand')).trim()
    if(!name||!brand){setError('Podaj markę i nazwę whisky.');return}
    if(all.some(w=>`${w.brand} ${w.name}`.toLowerCase()===`${brand} ${name}`.toLowerCase())){setError('Ta whisky jest już w katalogu. Znajdziesz ją w wyszukiwarce.');return}
    const url=String(f.get('imageUrl')||'').trim();if(url&&!safeUrl(url)){setError('Adres zdjęcia musi zaczynać się od https://.');return}
    setBusy(true)
    const saved = await onSave({id:`custom-${crypto.randomUUID()}`,name,brand,series:String(f.get('series')||'Własna kolekcja').trim(),category:'Klasyka',abv:f.get('abv')?Number(f.get('abv')):null,age:f.get('age')?Number(f.get('age')):null,ageStatus:f.get('age')?'stated':f.get('ageStatus')==='nas'?'nas':'unknown',whiskyType:String(f.get('whiskyType')||'unknown') as WhiskyType,volume:f.get('volume')?Number(f.get('volume')):null,country:String(f.get('country')).trim()||'Niepodane',description:String(f.get('description')||'').trim(),image:image||url,source:'',imageSource:image?'':url,tags:[],custom:true},f.get('bar')==='on')
    setBusy(false);if(!saved)setError('Nie udało się zapisać zmian. Sprawdź komunikat o zapisie i spróbuj ponownie.')
  }
  return <Modal title={t("Dodaj własną whisky")} onClose={onClose}><h2>{t("Własny wpis")}</h2><p className="muted">{t("Nie ma jej w katalogu? Dodaj whisky do swojego dziennika.")}</p><form onSubmit={submit}><div className="form-two"><label className="field">{t("Marka")}<input name="brand" defaultValue={defaultBrand} required maxLength={100}/></label><label className="field">{t("Nazwa / edycja")}<input name="name" required maxLength={150} placeholder={t("np. Black Label")}/></label></div><div className="form-three"><label className="field">{t("Moc (%)")}<input name="abv" type="number" min="0.1" max="100" step="0.1" placeholder="40"/></label><label className="field">{t("Wiek (lata)")}<input name="age" type="number" min="1" max="100" step="1" placeholder={t("Brak danych")}/></label><label className="field">{t("Pojemność (ml)")}<input name="volume" type="number" min="1" max="10000" step="1" placeholder="700"/></label></div><div className="form-two"><label className="field">{t('Gdy wiek jest pusty')}<select name="ageStatus"><option value="unknown">{t('Brak danych')}</option><option value="nas">NAS — {t('Bez deklaracji wieku')}</option></select></label><label className="field">{t('Typ whisky')}<select name="whiskyType" defaultValue="unknown">{WHISKY_TYPES.map(type=><option key={type} value={type}>{t(typeNames[type])}</option>)}</select></label></div><label className="field">{t("Kraj")}<input name="country" defaultValue={t("Szkocja")} maxLength={100}/></label><label className="field">{t("Notatka")} <span>{t("Opcjonalnie")}</span><textarea name="description" rows={2} maxLength={3000} placeholder={t("Co wyróżnia tę butelkę?")}/></label><label className="photo-upload">{image?<img src={image} alt={t("Wybrane zdjęcie whisky")}/>:<Upload size={24}/>}<strong>{busy?t("Przetwarzanie…"):image?t("Zmień zdjęcie"):t("Dodaj zdjęcie butelki")}</strong><span>{t("JPG, PNG lub WebP · do 10 MB")}</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("Dodaj zdjęcie whisky")} onChange={e=>{if(e.target.files?.[0])void photo(e.target.files[0])}}/></label>{image?<button className="text-button photo-remove" type="button" onClick={()=>setImage('')}>{t("Usuń zdjęcie")}</button>:<label className="field">{t("Lub adres zdjęcia")} <span>{t("Opcjonalnie")}</span><input name="imageUrl" type="url" placeholder="https://…"/></label>}<label className="checkbox-field"><input type="checkbox" name="bar" defaultChecked/>  {t("Dodaj od razu do mojego barku")}</label>{error&&<p role="alert" className="form-error">{t(error)}</p>}<button type="submit" className="button dark full" disabled={busy}><Plus size={17}/>  {t("Dodaj whisky")}</button></form></Modal>
}
