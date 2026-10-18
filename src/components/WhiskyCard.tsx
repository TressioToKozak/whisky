import { Bookmark, Check, ChevronRight, Minus, Plus } from 'lucide-react'
import type { Bottle, Whisky } from '../model'
import { formatScore } from '../model'
import { marketLabel, priceLabel } from '../pricing'
import type { PriceQuote } from '../pricing'
import { decimal, Photo, photoBackground } from './Primitives'

type Props = { whisky: Whisky; quote?: PriceQuote; bottle?: Bottle; score: number | null; wished: boolean; inCollection: boolean; onOpen: () => void; onWish: () => void; onAdd: () => void; onRate: () => void; onQuantity: (quantity: number) => void; onOpened: () => void }
export default function WhiskyCard({ whisky: w, quote, bottle, score, wished, inCollection, onOpen, onWish, onAdd, onRate, onQuantity, onOpened }: Props) {
  return <article className={`whisky-card ${inCollection ? 'collection-card' : ''}`} data-whisky-id={w.id}>
    <div className="card-photo-wrap" style={photoBackground(w)}><button className="photo-open" aria-label={`Zobacz ${w.brand} ${w.name}${!w.image ? ' — bez zdjęcia' : ''}`} onClick={onOpen}><Photo whisky={w}/></button>{bottle && <span className="owned-badge"><Check size={12}/> W barku{bottle.quantity > 1 ? ` · ${bottle.quantity}` : ''}</span>}</div>
    <div className="card-body"><button className={`wish-button ${wished ? 'selected' : ''}`} aria-label={`${wished ? 'Usuń z' : 'Dodaj do'} życzeń: ${w.name}`} aria-pressed={wished} onClick={onWish}><Bookmark size={20} fill={wished ? 'currentColor' : 'none'}/></button><p className="card-brand">{w.brand}</p><h3><button className="card-title" onClick={onOpen}>{w.name}</button></h3><p className="card-meta">{w.age && <>{w.age} lat · </>}{w.abv ? `${decimal(w.abv)}%` : 'Moc niepodana'}{w.volume && <> · {decimal(w.volume / 10)} cl</>}</p>
      <div className="card-price"><strong>{priceLabel(quote)}</strong>{quote && <span>{marketLabel(quote)}</span>}</div>
      {score !== null && <button className="card-rating" onClick={onRate} aria-label={`${formatScore(score)} / 10 · moja ocena. Oceń ${w.name}`}><strong>{formatScore(score)}</strong><span>/ 10 · moja ocena</span></button>}
      {inCollection && bottle && <div className="card-stock"><button className={`open-status ${bottle.opened ? 'is-open' : ''}`} onClick={onOpened} aria-label={`${bottle.opened ? 'Otwarta' : 'Nieotwarta'} butelka: ${w.name}`} aria-pressed={bottle.opened}>{bottle.opened ? 'Otwarta' : 'Nieotwarta'}</button><div className="quantity compact"><button aria-label={`Odejmij sztukę: ${w.name}`} onClick={() => onQuantity(bottle.quantity - 1)}><Minus size={16}/></button><span aria-label={`Sztuki: ${w.name}`}>{bottle.quantity}</span><button aria-label={`Dodaj sztukę: ${w.name}`} disabled={bottle.quantity >= 999} onClick={() => onQuantity(bottle.quantity + 1)}><Plus size={16}/></button></div></div>}
      <button className={`add-bar ${bottle ? 'in-bar' : ''}`} aria-label={bottle ? 'Szczegóły butelki' : 'Dodaj do barku'} onClick={onAdd}>{bottle ? <>Szczegóły butelki <ChevronRight size={16}/></> : <><Plus size={16}/> Dodaj do barku</>}</button>
    </div>
  </article>
}
