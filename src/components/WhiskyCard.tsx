import { interpolate, t } from '../i18n'
import { Check, ChevronRight, Plus } from 'lucide-react'
import type { Bottle, Whisky } from '../model'
import { priceLabel } from '../pricing'
import type { PriceQuote } from '../pricing'
import { Photo, photoBackground } from './Primitives'

type Props = { whisky: Whisky; quote?: PriceQuote; bottle?: Bottle; wished: boolean; inCollection: boolean; onOpen: () => void; onAdd: () => void; onQuantity: (quantity: number) => void }
export default function WhiskyCard({ whisky: w, quote, bottle, wished, inCollection, onOpen, onAdd, onQuantity }: Props) {
  return <article className={`whisky-card ${inCollection ? 'collection-card' : ''}`} data-whisky-id={w.id}>
    <div className="card-photo-wrap" style={photoBackground(w)}><button className="photo-open" aria-label={interpolate('Zobacz {0} {1}', w.brand, w.name) + (!w.image ? t(' — bez zdjęcia') : '')} onClick={onOpen}><Photo whisky={w}/></button>{bottle && !inCollection && <span className="owned-badge"><Check size={12}/>  {t("W barku")}</span>}</div>
    <div className="card-body"><p className="card-brand">{w.brand}</p><h3><button className="card-title" onClick={onOpen}>{w.name}</button></h3><p className="card-meta">{w.volume ? `${w.volume} ml` : t("Pojemność niepodana")}{w.age ? ` · ${w.age} ${t('lat')}` : ''}</p>
      <div className="card-price"><strong>{priceLabel(quote)}</strong></div>
      {inCollection && bottle ? <div className="card-stock"><span>{bottle.quantity}  {t("szt. ·")} {t('Otwarte')}: {bottle.openedCount} · {t('Zamknięte')}: {bottle.quantity-bottle.openedCount}</span><button className="icon-button" aria-label={interpolate('Dodaj sztukę: {0}', w.name)} disabled={bottle.quantity >= 999} onClick={() => onQuantity(bottle.quantity + 1)}><Plus size={18}/></button></div> : <button className={`add-bar ${bottle ? 'in-bar' : ''}`} aria-label={bottle ? t("W barku — szczegóły butelki") : t("Dodaj do barku")} onClick={onAdd}>{bottle ? <>{t("W barku")} <ChevronRight size={16}/></> : <><Plus size={16}/>  {t("Dodaj do barku")}</>}</button>}
      {wished && !inCollection && <span className="sr-only">{t("Na liście życzeń")}</span>}
    </div>
  </article>
}
