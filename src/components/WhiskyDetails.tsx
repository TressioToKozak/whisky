import { displayBarcode } from '../barcode'
import barcodeEntries from '../barcodes.json'
import { locale, interpolate, t, t as translateTag } from '../i18n'
import { ArrowUpRight, Bookmark, Check, Minus, Plus, Trash2 } from 'lucide-react'
import type { Bottle, Review, Whisky } from '../model'
import { average, formatScore } from '../model'
import type { PriceQuote } from '../pricing'
import { marketLabel, priceLabel, priceNote } from '../pricing'
import { counted, decimal, Modal, Photo, photoBackground, shortDate } from './Primitives'

type Props = { whisky: Whisky; quote?: PriceQuote; reviews: Review[]; bottle?: Bottle; wished: boolean; onClose: () => void; onWish: () => void; onRate: () => void; onAdd: () => void; onQuantity: (n: number) => void; onOpened: (opened: boolean) => void; onEditReview: (review: Review) => void; onDeleteReview: (review: Review) => void; onDeleteCustom: () => void }
export default function WhiskyDetails({ whisky: w, quote, reviews, bottle, wished, onClose, onWish, onRate, onAdd, onQuantity, onOpened, onEditReview, onDeleteReview, onDeleteCustom }: Props) {
  const score = average(reviews)
  const codes = [...new Set(barcodeEntries.filter(entry => entry.whiskyId === w.id && entry.volumeMl === w.volume).map(entry => entry.code))]
  const description = w.description && !/^(Archiwalne lub kolekcjonerskie|Osobne wydanie|Whisky z rodziny)/.test(w.description) ? w.description : ''
  return <Modal title={t("Poznaj whisky")} onClose={onClose} className="detail-modal">
    <div className="detail-top"><div className="detail-photo" style={photoBackground(w)}><Photo whisky={w} eager/></div><div className="detail-intro"><p className="detail-brand">{w.brand}</p><h2>{w.name}</h2><p className="eyebrow">{t(w.category)}</p>
      {score !== null && <p className="detail-average"><strong>{formatScore(score, locale())}</strong><span>{t("/ 10 · Twoja średnia z")} {reviews.length}  {t("ocen")}</span></p>}
      <dl className="detail-specs"><div><dt>{t("Pochodzenie")}</dt><dd>{t(w.country)}</dd></div><div><dt>{t("Moc")}</dt><dd>{w.abv ? `${decimal(w.abv)}%` : t("Niepodana")}</dd></div><div><dt>{t("Wiek")}</dt><dd>{w.age ? counted(w.age, 'rok', 'lata', 'lat') : 'NAS'}</dd></div><div><dt>{t("Pojemność")}</dt><dd>{w.volume ? `${w.volume} ml` : t("Niepodana")}</dd></div></dl>
      {quote && <div className="detail-price"><p className="page-kicker">{t("Cena orientacyjna")}</p><div><strong>{priceLabel(quote)}</strong><span>{marketLabel(quote)}</span></div>{quote.referenceOnly && <p className="reference-price-note">{t("Wyłącznie referencja — poza sumą kolekcji. Brak potwierdzenia zgodnej pojemności lub mocy.")}</p>}<details><summary>{t("Źródło ceny i szczegóły")}</summary><a href={quote.sourceUrl} target="_blank" rel="noopener noreferrer">{quote.sourceName} <ArrowUpRight size={16}/></a><p>{priceNote(quote)}</p>{quote.convertedFromEUR !== undefined && <small className="price-conversion">{t("Przeliczenie, nie oferta lokalnego sklepu.")}<br/>1 EUR = {quote.conversionRate} PLN · {quote.conversionDate}<br/><a href={quote.conversionSource} target="_blank" rel="noopener noreferrer">{t("Kurs walut")}</a></small>}<small>{t("Sprawdzono:")} {quote.checkedAt}{quote.originalCurrency !== 'EUR' && ` · ${t('Cena źródłowa:')} ${quote.originalAmount} ${quote.originalCurrency}`}</small></details></div>}
    </div></div>

    <details className="barcode-status"><summary>{codes.length ? t('Kod potwierdzony dla tej pojemności') : t('Brak potwierdzonego kodu dla tego wydania')}</summary>{codes.length ? codes.map(code => <div key={code}><code>{displayBarcode(code)}</code> · {w.volume} ml</div>) : <p>{t('Po skanie możesz dopasować swoją butelkę.')}</p>}</details>
    {!quote && <p className="muted">{t('Brak potwierdzonej ceny dla tego wydania.')}</p>}
    <div className="detail-actions"><button className="button dark" onClick={onRate}>{t("Zapisz degustację")}</button><button className={`button outline ${wished ? 'wish-active' : ''}`} onClick={onWish}><Bookmark size={18} fill={wished ? 'currentColor' : 'none'}/>{wished ? t("Na liście życzeń") : t("Chcę spróbować")}</button></div>
    {bottle ? <div className="bar-manager"><div><strong><Check size={16}/>  {t("W Twoim barku")}</strong><label><input type="checkbox" checked={bottle.opened} onChange={e => onOpened(e.target.checked)}/>  {t("Mam otwartą butelkę")}</label></div><div className="quantity"><button aria-label={t("Zmniejsz liczbę butelek")} onClick={() => onQuantity(bottle.quantity - 1)}><Minus size={18}/></button><span aria-label={t("Liczba butelek")}>{bottle.quantity}</span><button aria-label={t("Zwiększ liczbę butelek")} disabled={bottle.quantity >= 999} onClick={() => onQuantity(bottle.quantity + 1)}><Plus size={18}/></button></div></div> : <button className="button outline full" onClick={onAdd}><Plus size={18}/>  {t("Dodaj do barku")}</button>}
    {(description || w.tags.length > 0) && <details className="detail-description"><summary>{t("O whisky")}</summary>{description && <p>{t(description)}</p>}{w.tags.length > 0 && <div className="detail-tags">{w.tags.map(t => <span key={t}>{translateTag(t)}</span>)}</div>}</details>}
    <details className="review-section"><summary>{interpolate('Historia degustacji ({0})', reviews.length)}</summary>{!reviews.length && <p className="muted">{t("Jeszcze bez oceny. Zapisz wrażenia po degustacji.")}</p>}{[...reviews].reverse().sort((a, b) => b.date.localeCompare(a.date)).map(r => <article className="review-entry" key={r.id}><div className="review-entry-header"><span className="score">{formatScore(r.score, locale())}<small>/ 10</small></span><time dateTime={r.date}>{shortDate(r.date)}</time></div>{r.note && <p className="review-note">{r.note}</p>}{r.tags.length > 0 && <div className="detail-tags">{r.tags.map(t => <span key={t}>{translateTag(t)}</span>)}</div>}<div className="review-entry-actions"><button className="text-button" onClick={() => onEditReview(r)}>{t("Edytuj")}</button><button className="icon-button" aria-label={t("Usuń degustację")} onClick={() => onDeleteReview(r)}><Trash2 size={18}/></button></div></article>)}</details>

    {w.custom && <button className="danger-link" onClick={onDeleteCustom}><Trash2 size={17}/>  {t("Usuń własny wpis")}</button>}
  </Modal>
}
