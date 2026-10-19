import catalog from './catalog.json' with {type:'json'}
import {emptyJournal,validateJournal} from './model.ts'
import type {Journal} from './model.ts'
export const COLLECTION_KEY='dram.journal.v3'
export const COLLECTION_PENDING='dram.journal.pending.v3.'
export const BOTTLE_STATUSES=['closed','open','empty','sold','gifted','archived'] as const
export type BottleStatus=typeof BOTTLE_STATUSES[number]
export type Currency='EUR'|'PLN'|'GBP'|'USD'
export type Condition='unknown'|'excellent'|'good'|'damaged'|'missing'
export type Purchase={kind:'unknown'|'purchase'|'gift';date:string|null;amount:number|null;currency:Currency;place:string}
export type Sale={date:string|null;amount:number|null;fees:number|null;currency:Currency}
export type Attachment={id:string;kind:'front'|'back'|'seal'|'cork'|'box'|'other'|'receipt';name:string;data:string}
export type OwnedBottle={
 id:string;whiskyId:string;status:BottleStatus;purchase:Purchase;sale:Sale|null;
 openedAt:string|null;remainingMl:number|null;remainingPercent:number|null;
 bottleNumber:string;caskNumber:string;batch:string;
 condition:{label:Condition;cork:Condition;bottle:Condition;packaging:Condition};
 locationId:string|null;notes:string;attachments:Attachment[];createdAt:string|null;updatedAt:string|null;
}
export type BottleEvent={id:string;bottleId:string;at:string;kind:'added'|'edited'|'status'|'moved';changes:{field:string;from:string|null;to:string|null}[]}
export type StorageLocation={id:string;name:string;parentId:string|null;kind:'home'|'room'|'rack'|'shelf'|'other'}
/** bottles is an always-recomputed compatibility projection, never a second source of stock. */
export type CollectionJournal=Omit<Journal,'version'> & {version:3;ownedBottles:OwnedBottle[];events:BottleEvent[];locations:StorageLocation[]}
export const emptyCollection=():CollectionJournal=>({...emptyJournal(),version:3,ownedBottles:[],events:[],locations:[]})
export const activeBottle=(b:OwnedBottle)=>b.status==='closed'||b.status==='open'
export function stockProjection(owned:OwnedBottle[]):Journal['bottles'] {
 const rows=new Map<string,Journal['bottles'][number]>()
 for(const b of owned)if(activeBottle(b)){const row=rows.get(b.whiskyId)??{whiskyId:b.whiskyId,quantity:0,openedCount:0};row.quantity++;if(b.status==='open')row.openedCount++;rows.set(b.whiskyId,row)}
 return [...rows.values()]
}
export const asLegacyJournal=(j:CollectionJournal):Journal=>({version:2,custom:j.custom,reviews:j.reviews,bottles:stockProjection(j.ownedBottles),wishlist:j.wishlist,...(j.barcodeLinks?{barcodeLinks:j.barcodeLinks}:{})})
export function blankBottle(id:string,whiskyId:string):OwnedBottle{return{id,whiskyId,status:'closed',purchase:{kind:'unknown',date:null,amount:null,currency:'EUR',place:''},sale:null,openedAt:null,remainingMl:null,remainingPercent:null,bottleNumber:'',caskNumber:'',batch:'',condition:{label:'unknown',cork:'unknown',bottle:'unknown',packaging:'unknown'},locationId:null,notes:'',attachments:[],createdAt:null,updatedAt:null}}
const string=(v:unknown,max=3000):v is string=>typeof v==='string'&&v.length<=max
const id=(v:unknown):v is string=>string(v,180)&&/^[a-zA-Z0-9][a-zA-Z0-9_:.-]*$/.test(v)
const num=(v:unknown,max=1e10):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max
export const validDate=(v:unknown):v is string=>string(v,10)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v
const date=(v:unknown)=>v===null||validDate(v)
const timestamp=(v:unknown)=>v===null||(string(v,30)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v)
const currency=(v:unknown)=>['EUR','PLN','GBP','USD'].includes(v as string)
const condition=(v:unknown)=>['unknown','excellent','good','damaged','missing'].includes(v as string)
function fail(message='Nieprawidłowe dane egzemplarza.'):never{throw Error(message)}
function unique(rows:{id:string}[]){if(new Set(rows.map(r=>r?.id)).size!==rows.length)fail('Powtarzające się identyfikatory egzemplarzy, zdarzeń lub lokalizacji.')}
export function validateCollection(value:unknown,catalogIds:string[]):CollectionJournal {
 if(!value||typeof value!=='object')fail('Nieprawidłowy plik kopii danych.')
 const d=value as CollectionJournal
 if([1,2].includes((value as {version:number}).version)){
  const legacy=validateJournal(value,catalogIds)
  if(legacy.bottles.reduce((n,b)=>n+b.quantity,0)>20000)fail('Ta kolekcja jest zbyt duża do bezpiecznej migracji lokalnej. Pobierz dotychczasową kopię; potrzebny jest etap przechowywania w IndexedDB.')
  const ownedBottles=legacy.bottles.flatMap((b,row)=>Array.from({length:b.quantity},(_,i)=>({...blankBottle(`migrated:${row}:${i+1}`,b.whiskyId),status:i<b.openedCount?'open' as const:'closed' as const})))
  return {...legacy,version:3,ownedBottles,events:[],locations:[],bottles:stockProjection(ownedBottles)}
 }
 if(d.version!==3||!Array.isArray(d.ownedBottles)||!Array.isArray(d.events)||!Array.isArray(d.locations))fail('Nieobsługiwany format kopii. Wybierz plik JSON wyeksportowany z Dram.')
 if(d.ownedBottles.length>100_000||d.events.length>200_000||d.locations.length>4000)fail('Kopia przekracza dozwoloną liczbę wpisów.')
 // Reuse the proven validation of custom releases, reviews, wishes and barcode links.
 const common=validateJournal({...d,version:2,bottles:[]},catalogIds),ids=new Set([...catalogIds,...common.custom.map(w=>w.id)])
 unique(d.ownedBottles);unique(d.events);unique(d.locations)
 const locations=d.locations.map(l=>{
  if(!l||!id(l.id)||!string(l.name,120)||!l.name.trim()||!(l.parentId===null||id(l.parentId))||!['home','room','rack','shelf','other'].includes(l.kind))fail('Nieprawidłowa lokalizacja przechowywania.')
  return{id:l.id,name:l.name,parentId:l.parentId,kind:l.kind}
 })
 const locationMap=new Map(locations.map(l=>[l.id,l]))
 for(const location of locations){const seen=new Set([location.id]);let next=location.parentId;while(next!==null){if(!locationMap.has(next)||seen.has(next)||seen.size>20)fail('Lokalizacje zawierają cykl lub nieznanego rodzica.');seen.add(next);next=locationMap.get(next)!.parentId}}
 const volumes=new Map([...catalog,...common.custom].map(w=>[w.id,w.volume]))
 const ownedBottles=d.ownedBottles.map(b=>{
  if(!b||!id(b.id)||!ids.has(b.whiskyId)||!BOTTLE_STATUSES.includes(b.status)||!b.purchase||!['unknown','purchase','gift'].includes(b.purchase.kind)||!date(b.purchase.date)||!(b.purchase.amount===null||num(b.purchase.amount))||!currency(b.purchase.currency)||!string(b.purchase.place,300)||!date(b.openedAt)||!(b.remainingMl===null||num(b.remainingMl,10000))||!(b.remainingPercent===null||num(b.remainingPercent,100))||b.remainingMl!==null&&b.remainingPercent!==null||!string(b.bottleNumber,150)||!string(b.caskNumber,150)||!string(b.batch,150)||!b.condition||!Object.values(b.condition).every(condition)||!['label','cork','bottle','packaging'].every(k=>k in b.condition)||!(b.locationId===null||locationMap.has(b.locationId))||!string(b.notes)||!Array.isArray(b.attachments)||b.attachments.length>15||!timestamp(b.createdAt)||!timestamp(b.updatedAt))fail()
  if(b.purchase.kind!=='purchase'&&b.purchase.amount!==null)fail('Prezent nie może mieć przypisanego kosztu zakupu.')
  if(b.status==='empty'&&(b.remainingMl!==0||b.remainingPercent!==null))fail('Opróżniony egzemplarz musi mieć 0 ml.')
  const volume=volumes.get(b.whiskyId)
  if(volume && b.remainingMl!==null && b.remainingMl>volume)fail('Pozostała objętość przekracza pojemność wydania.')
  const s=b.sale
  if(s&&(!date(s.date)||!(s.amount===null||num(s.amount))||!(s.fees===null||num(s.fees))||!currency(s.currency)))fail('Nieprawidłowe dane sprzedaży.')
  unique(b.attachments)
  const attachments=b.attachments.map(a=>{if(!a||!id(a.id)||!['front','back','seal','cork','box','other','receipt'].includes(a.kind)||!string(a.name,160)||!string(a.data,1_500_000)||!/^data:(?:image\/(?:jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/.test(a.data)||(a.data.startsWith('data:application/pdf')&&a.kind!=='receipt'))fail('Nieprawidłowy załącznik egzemplarza.');return{id:a.id,kind:a.kind,name:a.name,data:a.data}})
  return {...blankBottle(b.id,b.whiskyId),status:b.status,purchase:{kind:b.purchase.kind,date:b.purchase.date,amount:b.purchase.amount,currency:b.purchase.currency,place:b.purchase.place},sale:s?{date:s.date,amount:s.amount,fees:s.fees,currency:s.currency}:null,openedAt:b.openedAt,remainingMl:b.remainingMl,remainingPercent:b.remainingPercent,bottleNumber:b.bottleNumber,caskNumber:b.caskNumber,batch:b.batch,condition:{label:b.condition.label,cork:b.condition.cork,bottle:b.condition.bottle,packaging:b.condition.packaging},locationId:b.locationId,notes:b.notes,attachments,createdAt:b.createdAt,updatedAt:b.updatedAt}
 })
 const bottleIds=new Set(ownedBottles.map(b=>b.id))
 const events=d.events.map(e=>{if(!e||!id(e.id)||!bottleIds.has(e.bottleId)||!timestamp(e.at)||e.at===null||!['added','edited','status','moved'].includes(e.kind)||!Array.isArray(e.changes)||e.changes.length>40||e.changes.some(c=>!c||!string(c.field,100)||!(c.from===null||string(c.from,10000))||!(c.to===null||string(c.to,10000))))fail('Nieprawidłowa historia egzemplarza.');return{id:e.id,bottleId:e.bottleId,at:e.at,kind:e.kind,changes:e.changes.map(c=>({field:c.field,from:c.from,to:c.to}))}})
 const bottles=stockProjection(ownedBottles)
 if(bottles.some(b=>b.quantity>999))fail('Liczba posiadanych egzemplarzy jednego wydania nie może przekroczyć 999.')
 return {...common,version:3,ownedBottles,events,locations,bottles}
}
