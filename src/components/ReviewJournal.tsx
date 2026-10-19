import { locale, interpolate, t, t as translateTag } from '../i18n'
import { ArrowUpRight } from 'lucide-react'
import type { Review, Whisky } from '../model'
import { formatScore } from '../model'
import { Photo, photoBackground, shortDate } from './Primitives'

export default function ReviewJournal({ reviews, all, onOpen, onEdit }: { reviews: Review[]; all: Whisky[]; onOpen: (w: Whisky) => void; onEdit: (w: Whisky, r: Review) => void }) {
  return <div className="tasting-journal">{reviews.map(r => {
    const w = all.find(w => w.id === r.whiskyId)
    if (!w) return null
    return <article className="whisky-card journal-card" data-whisky-id={w.id} key={r.id}><time dateTime={r.date}>{shortDate(r.date)}</time><div className="journal-entry-body"><button className="journal-photo" style={photoBackground(w)} onClick={() => onOpen(w)} aria-label={interpolate('Zobacz {0} {1}', w.brand, w.name)}><Photo whisky={w}/></button><div className="journal-entry-copy"><p className="card-brand">{w.brand}</p><h3><button className="card-title" onClick={() => onOpen(w)}>{w.name}</button></h3><div className="card-rating"><strong>{formatScore(r.score, locale())}</strong><span>/ 10</span></div></div></div>{r.note ? <p className="journal-note">{r.note}</p> : <p className="journal-no-note">{t("Ocena bez dodatkowej notatki.")}</p>}{r.tags.length > 0 && <div className="detail-tags">{r.tags.map(t => <span key={t}>{translateTag(t)}</span>)}</div>}<div className="journal-entry-actions"><button className="text-button" onClick={() => onEdit(w, r)}>{t("Edytuj wpis")}</button><button className="text-button" onClick={() => onOpen(w)}>{t("Historia butelki")} <ArrowUpRight size={16}/></button></div></article>
  })}</div>
}
