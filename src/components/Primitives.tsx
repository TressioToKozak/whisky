import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { Search, Wine, X } from 'lucide-react'
import type { Whisky } from '../model'
import photoLayoutData from '../photo-layout.json'

const layouts = photoLayoutData as Record<string, { inset: string; background: string; ratio: number; clipPath?: string; rotationDeg?: number }>
let openModals = 0
let bodyOverflowBeforeModals = ''
export const photoBackground = (_whisky: Whisky) => ({ background: '#fff' })
export const decimal = (n: number) => n.toLocaleString('pl-PL')
export const counted = (n: number, one: string, few: string, many: string) => `${decimal(n)} ${({ one, few } as Record<string, string>)[new Intl.PluralRules('pl').select(n)] ?? many}`
export const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return <span className={`wordmark ${compact ? 'wordmark-compact' : ''}`}><span>dram<span className="wordmark-dot">.</span></span>{!compact && <>{' '}<small>Dziennik whisky</small></>}</span>
}
export function Photo({ whisky, className = '', eager = false }: { whisky: Whisky; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (!whisky.image || failed) return <div className={`photo-missing ${className}`}><Wine size={28} strokeWidth={1}/><span>Bez zdjęcia</span></div>
  return <img className={`bottle-photo ${className}`} style={{ objectViewBox: layouts[whisky.id]?.inset, transform: layouts[whisky.id]?.rotationDeg ? `rotate(${layouts[whisky.id].rotationDeg}deg)` : undefined, '--photo-ratio': layouts[whisky.id]?.ratio ?? 1, '--photo-clip': layouts[whisky.id]?.clipPath ?? 'none', ...(layouts[whisky.id]?.clipPath ? { maskImage: 'none' } : {}) } as CSSProperties} src={whisky.image.startsWith('/') ? `${import.meta.env.BASE_URL}${whisky.image.slice(1)}` : whisky.image} alt={`${whisky.brand} ${whisky.name} — zdjęcie butelki`} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
}
export function SearchField({ value, onChange, label = 'Szukaj whisky', placeholder = 'Szukaj nazwy lub edycji', className = '' }: { value: string; onChange: (value: string) => void; label?: string; placeholder?: string; className?: string }) {
  return <div className={`search ${className}`}><Search size={19}/><input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}/>{value && <button aria-label="Wyczyść wyszukiwanie" onClick={() => onChange('')}><X size={18}/></button>}</div>
}
export function Modal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId()
  function keepFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const dialog = event.currentTarget
    const elements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')).filter(element => element.checkVisibility() && element.tabIndex >= 0)
    const first = elements[0], last = elements.at(-1)
    if (!first || !last) { event.preventDefault(); dialog.focus(); return }
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
  }
  useEffect(() => {
    const dialog = ref.current!, previous = document.activeElement as HTMLElement | null
    if (openModals === 0) { bodyOverflowBeforeModals = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    openModals++
    dialog.showModal()
    return () => {
      dialog.close(); openModals--
      if (openModals === 0) document.body.style.overflow = bodyOverflowBeforeModals
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={titleId} onKeyDown={keepFocus} onCancel={e => { e.preventDefault(); onClose() }} onClick={e => { if (e.target === ref.current) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose() } }}><div className="modal-heading"><span id={titleId}>{title}</span><button className="icon-button" onClick={onClose} aria-label="Zamknij"><X size={22}/></button></div><div className="modal-content">{children}</div></dialog>
}
