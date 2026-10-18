import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Camera, ChevronRight, ImagePlus, RotateCcw, Search, X } from 'lucide-react'
import { barcodeMatches, normalizeBarcode } from './barcode'
import type { BarcodeEntry, BarcodeLink } from './barcode'
import { matchesWhisky } from './model'
import type { Bottle, Whisky } from './model'

type Props = {
  all: Whisky[]; entries: BarcodeEntry[]; links: BarcodeLink[]; bottles: Bottle[];
  onAdd: (whisky: Whisky, code: string, remember: boolean) => void;
  onCreate: (code: string) => void;
  renderPhoto: (whisky: Whisky) => ReactNode;
}

export default function BarcodeScanner({ all, entries, links, bottles, onAdd, onCreate, renderPhoto }: Props) {
  const [input, setInput] = useState(''), [code, setCode] = useState('')
  const [selected, setSelected] = useState<Whisky | null>(null)
  const [picking, setPicking] = useState(false), [query, setQuery] = useState('')
  const [remember, setRemember] = useState(true), [busy, setBusy] = useState(false)
  const [camera, setCamera] = useState(false), [cameraReady, setCameraReady] = useState(false)
  const [slowRead, setSlowRead] = useState(false)
  const [error, setError] = useState(''), [adding, setAdding] = useState(false)
  const video = useRef<HTMLVideoElement>(null), abort = useRef<AbortController | null>(null)
  const mounted = useRef(true), confirming = useRef(false), photoTask = useRef(0)
  const matches = code ? barcodeMatches(code, all, entries, links) : []
  const owned = selected ? bottles.find(b => b.whiskyId === selected.id)?.quantity ?? 0 : 0
  const options = query.trim() ? all.filter(w => matchesWhisky(w, query)).slice(0, 20) : []
  function stopCamera() { abort.current?.abort(); abort.current = null; setCamera(false); setCameraReady(false) }
  function accept(raw: string) {
    const valid = normalizeBarcode(raw)
    if (!valid) { setError('Sprawdź numer: kod EAN lub UPC ma 8, 12, 13 albo 14 cyfr i poprawną cyfrę kontrolną.'); return }
    stopCamera(); photoTask.current++; setBusy(false); setError(''); setInput(raw.replace(/[\s-]/g, '')); setCode(valid); setPicking(false); setQuery('')
    const found = barcodeMatches(valid, all, entries, links)
    setSelected(found.length === 1 ? found[0] : null); setRemember(true)
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; photoTask.current++; abort.current?.abort() } }, [])
  useEffect(() => {
    const hide = () => { if (document.hidden) { abort.current?.abort(); setCamera(false); setCameraReady(false) } }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  useEffect(() => {
    if (!camera || !video.current) return
    const controller = new AbortController(); abort.current = controller
    void import('./barcode-camera').then(({ startBarcodeCamera }) => {
      if (controller.signal.aborted) return
      return startBarcodeCamera(video.current!, controller.signal, accept)
    }).then(() => { if (!controller.signal.aborted && mounted.current) setCameraReady(true) }).catch((e: unknown) => {
      if (controller.signal.aborted || !mounted.current) return
      const name = e instanceof DOMException ? e.name : ''
      setCamera(false); setCameraReady(false)
      setError(name === 'NotAllowedError' ? 'Brak dostępu do aparatu. Zezwól na aparat w ustawieniach przeglądarki albo wybierz zdjęcie lub wpisz numer.'
        : name === 'NotFoundError' ? 'Nie znaleziono aparatu. Wybierz zdjęcie kodu albo wpisz numer.'
        : name === 'NotReadableError' ? 'Aparat jest zajęty. Zamknij inne aplikacje używające aparatu i spróbuj ponownie.'
        : name === 'NotSupportedError' ? 'Ta przeglądarka nie udostępnia aparatu. Otwórz stronę przez HTTPS, wybierz zdjęcie albo wpisz numer.'
        : 'Nie udało się uruchomić aparatu. Spróbuj ponownie, wybierz zdjęcie kodu albo wpisz numer.')
    })
    return () => { controller.abort() }
    // Each camera session reads the current catalog; changing its result closes that session.
  }, [camera])
  useEffect(() => {
    setSlowRead(false)
    if (!cameraReady) return
    const timer = setTimeout(() => setSlowRead(true), 12000)
    return () => clearTimeout(timer)
  }, [cameraReady])
  async function photo(file: File) {
    stopCamera(); setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) { setError('Wybierz zdjęcie JPG, PNG lub WebP do 10 MB.'); return }
    const task = ++photoTask.current; setBusy(true)
    try {
      const { readBarcodePhoto } = await import('./barcode-camera')
      const result = await readBarcodePhoto(file)
      if (!mounted.current || task !== photoTask.current) return
      if (result) accept(result)
      else setError('Nie odczytano kodu. Zrób ostrzejsze zdjęcie całego kodu albo wpisz numer.')
    } catch {
      if (mounted.current && task === photoTask.current) setError('Nie odczytano kodu. Zrób ostrzejsze zdjęcie całego kodu albo wpisz numer.')
    } finally { if (mounted.current && task === photoTask.current) setBusy(false) }
  }
  function reset() { stopCamera(); photoTask.current++; setBusy(false); setCode(''); setSelected(null); setInput(''); setQuery(''); setError(''); setPicking(false); setAdding(false); confirming.current = false }
  function confirm() {
    if (!selected || !code || confirming.current || owned >= 999) return
    confirming.current = true; setAdding(true)
    try { onAdd(selected, code, remember) }
    catch (e) { setError(e instanceof Error ? e.message : 'Nie udało się dodać butelki.'); confirming.current = false; setAdding(false) }
  }
  function choose(w: Whisky) { setSelected(w); setPicking(false); setError('') }
  return <div className="barcode-scanner">
    <h2>{code ? 'Sprawdź butelkę' : 'Zeskanuj butelkę'}</h2>
    {!code ? <>
      <p className="muted">Skieruj aparat na kod kreskowy EAN lub UPC.</p>
      {camera ? <><div className="barcode-camera"><video ref={video} muted autoPlay playsInline aria-label="Podgląd aparatu"/><div className="barcode-guide" aria-hidden="true"/><span>{cameraReady ? 'Ustaw cały kod w kadrze i przytrzymaj telefon' : 'Uruchamianie aparatu…'}</span></div>{slowRead && <p role="status" className="barcode-note">Nie udało się jeszcze odczytać kodu. Odsuń butelkę, unikaj odblasków lub wybierz zdjęcie albo wpisz numer.</p>}<button className="text-button" onClick={stopCamera}><X size={16}/> Wyłącz aparat</button></>
        : <button className="button dark full" disabled={busy} onClick={() => { setError(''); setCamera(true) }}><Camera size={19}/> Włącz aparat</button>}
      <label className={`button outline full barcode-upload ${busy ? 'busy' : ''}`}><ImagePlus size={18}/>{busy ? 'Odczytuję zdjęcie…' : 'Wybierz zdjęcie kodu'}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Zdjęcie kodu kreskowego" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void photo(file) }}/></label>
      <form className="barcode-manual" onSubmit={e => { e.preventDefault(); accept(input) }}><label className="field">Numer EAN / UPC-A<input type="text" inputMode="numeric" autoComplete="off" aria-label="Numer kodu kreskowego" maxLength={32} value={input} onChange={e => setInput(e.target.value)} placeholder="np. 13 cyfr EAN"/></label><button className="button outline full" disabled={busy || !input.trim()} type="submit">Znajdź butelkę <ChevronRight size={16}/></button></form>
    </> : <>
      <div className="barcode-read"><span>Kod: <b>{input}</b></span><button className="text-button" onClick={reset}><RotateCcw size={14}/> Inny kod</button></div>
      {selected && !picking ? <>
        <div className="barcode-match">{renderPhoto(selected)}<div><p>{selected.brand}</p><h3>{selected.name}</h3><span>{selected.volume ? `${selected.volume} ml` : 'Pojemność niepodana'} · {selected.abv ? `${selected.abv}%` : 'Moc niepodana'}</span>{owned > 0 && <small>W barku: {owned} szt.</small>}</div></div>
        <p className="barcode-note">Sprawdź nazwę i pojemność. Jeden kod może występować przy różnych etykietach.</p>
        <button className="text-button" onClick={() => { setPicking(true); setQuery(''); setError('') }}>To inna whisky — wybierz z katalogu</button>
        <label className="checkbox-field"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/> Zapamiętaj dopasowanie kodu</label>
        {owned >= 999 && <p className="form-error">Osiągnięto limit 999 butelek tej whisky.</p>}
        <button className="button dark full" disabled={adding || owned >= 999} onClick={confirm}>{adding ? 'Dodawanie…' : owned ? 'Dodaj kolejną butelkę' : 'Dodaj butelkę do barku'}</button>
      </> : <>
        <p className="muted">{picking ? 'Wybierz whisky i pojemność zgodną z butelką.' : matches.length > 1 ? 'Ten kod pasuje do kilku wydań. Wybierz swoją butelkę.' : 'Kod odczytany. Nie mamy jeszcze jego przypisania — znajdź whisky w katalogu.'}</p>
        {!picking && matches.map(w => <button key={w.id} className="barcode-option" onClick={() => choose(w)}><span>{w.brand}<strong>{w.name}</strong><small>{w.volume ? `${w.volume} ml` : 'Pojemność niepodana'}</small></span><ChevronRight size={17}/></button>)}
        <div className="search"><Search size={17}/><input type="search" aria-label="Dopasuj whisky do kodu" placeholder="Marka, nazwa lub edycja" value={query} onChange={e => setQuery(e.target.value)}/></div>
        {options.map(w => <button key={w.id} className="barcode-option" onClick={() => choose(w)}><span>{w.brand}<strong>{w.name}</strong><small>{w.volume ? `${w.volume} ml` : 'Pojemność niepodana'} · {w.abv ? `${w.abv}%` : 'Moc niepodana'}</small></span><ChevronRight size={17}/></button>)}
        {query.trim() && !options.length && <p className="muted">Nie ma takiej whisky w katalogu.</p>}
        {options.length === 20 && <p className="barcode-note">Pokazano 20 dopasowań. Dopisz nazwę edycji, żeby zawęzić wyniki.</p>}
        <button className="button outline full" onClick={() => onCreate(code)}>Dodaj własną whisky</button>
      </>}
    </>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>
}
