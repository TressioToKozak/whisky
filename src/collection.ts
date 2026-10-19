import {JournalDraftConflict} from './journal-store.ts'
import {activeBottle,asLegacyJournal,blankBottle,stockProjection} from './collection-model.ts'
import type {CollectionJournal,OwnedBottle,BottleEvent,StorageLocation} from './collection-model.ts'
import type {Journal} from './model.ts'
export type Mutation={id:string;at:string}
export const mutation=():Mutation=>({id:crypto.randomUUID(),at:new Date().toISOString()})
const summary=(value:unknown):string|null=>value===null?null:typeof value==='string'?value:JSON.stringify(value)
function changes(before:OwnedBottle,after:OwnedBottle):BottleEvent['changes']{
 return (Object.keys(before)as(keyof OwnedBottle)[]).filter(k=>!['id','whiskyId','createdAt','updatedAt'].includes(k)&&JSON.stringify(before[k])!==JSON.stringify(after[k])).map(field=>({field,from:summary(field==='attachments'?before.attachments.map(({data,...a})=>a):before[field]),to:summary(field==='attachments'?after.attachments.map(({data,...a})=>a):after[field])}))
}
export function editBottle(j:CollectionJournal,updated:OwnedBottle,original:OwnedBottle,m:Mutation):CollectionJournal{
 const current=j.ownedBottles.find(b=>b.id===original.id)
 if(!current||updated.id!==original.id||updated.whiskyId!==original.whiskyId||JSON.stringify(current)!==JSON.stringify(original))throw new JournalDraftConflict('Ten egzemplarz zmienił się w innej karcie. Twoje zmiany pozostają w formularzu.',{...j,ownedBottles:current?j.ownedBottles.map(b=>b.id===updated.id?updated:b):[...j.ownedBottles,updated]})
 const after={...updated,createdAt:current.createdAt,updatedAt:m.at},delta=changes(current,after).map(c=>c.field==='locationId'?{...c,from:locationPath(j.locations,current.locationId)||null,to:locationPath(j.locations,after.locationId)||null}:c)
 if(!delta.length)return j
 const event:BottleEvent={id:`${m.id}:event`,bottleId:current.id,at:m.at,kind:current.status!==after.status?'status':current.locationId!==after.locationId?'moved':'edited',changes:delta}
 const ownedBottles=j.ownedBottles.map(b=>b.id===after.id?after:b)
 return {...j,ownedBottles,events:[...j.events,event],bottles:stockProjection(ownedBottles)}
}
export function addBottles(j:CollectionJournal,whiskyId:string,count:number,m:Mutation):CollectionJournal{
 if(!Number.isInteger(count)||count<1||count>999||j.ownedBottles.filter(b=>b.whiskyId===whiskyId&&activeBottle(b)).length+count>999)throw Error('Liczba egzemplarzy musi wynosić od 1 do 999.')
 const ownedBottles=[...j.ownedBottles],events=[...j.events]
 for(let i=0;i<count;i++){const b={...blankBottle(`${m.id}:${i}`,whiskyId),createdAt:m.at,updatedAt:m.at};ownedBottles.push(b);events.push({id:`${m.id}:added:${i}`,bottleId:b.id,at:m.at,kind:'added',changes:[]})}
 return {...j,ownedBottles,events,bottles:stockProjection(ownedBottles)}
}
/** Preserve existing release-level controls by translating count deltas to physical records. */
export function applyLegacyChange(j:CollectionJournal,next:Journal,m:Mutation):CollectionJournal{
 let result:CollectionJournal={...j,custom:next.custom,reviews:next.reviews,wishlist:next.wishlist,barcodeLinks:next.barcodeLinks}
 const originals=stockProjection(j.ownedBottles),ids=new Set([...originals.map(b=>b.whiskyId),...next.bottles.map(b=>b.whiskyId)])
 let sequence=0
 const step=()=>({...m,id:`${m.id}:${sequence++}`})
 for(const whiskyId of ids){
  const target=next.bottles.find(b=>b.whiskyId===whiskyId)??{quantity:0,openedCount:0}
  let active=result.ownedBottles.filter(b=>b.whiskyId===whiskyId&&activeBottle(b))
  if(target.quantity>active.length)result=addBottles(result,whiskyId,target.quantity-active.length,step())
  else if(target.quantity<active.length){
   // Withdraw closed copies first. Never fabricate a sale, gift, or emptying.
   active=[...active].sort((a,b)=>Number(a.status==='open')-Number(b.status==='open'))
   for(const b of active.slice(0,active.length-target.quantity))result=editBottle(result,{...b,status:'archived'},b,step())
  }
  active=result.ownedBottles.filter(b=>b.whiskyId===whiskyId&&activeBottle(b))
  const opened=active.filter(b=>b.status==='open').length,delta=target.openedCount-opened
  for(const b of active.filter(b=>b.status===(delta>0?'closed':'open')).slice(0,Math.abs(delta)))result=editBottle(result,{...b,status:delta>0?'open':'closed',openedAt:delta>0?(b.openedAt??m.at.slice(0,10)):null},b,step())
 }
 // Explicitly deleting a custom release retains the old documented removal semantics.
 const removed=new Set(j.custom.filter(w=>!next.custom.some(n=>n.id===w.id)).map(w=>w.id))
 const ownedBottles=result.ownedBottles.filter(b=>!removed.has(b.whiskyId)),bottleIds=new Set(ownedBottles.map(b=>b.id))
 return {...result,ownedBottles,events:result.events.filter(e=>bottleIds.has(e.bottleId)),bottles:stockProjection(ownedBottles)}
}
export function adaptLegacyRecipe(recipe:(j:Journal)=>Journal,m:Mutation){return(j:CollectionJournal)=>{
 try{return applyLegacyChange(j,recipe(asLegacyJournal(j)),m)}catch(error){
  if(error instanceof JournalDraftConflict)throw new JournalDraftConflict(error.message,applyLegacyChange(j,error.draft as Journal,m))
  throw error
 }
}}
export function locationPath(locations:StorageLocation[],id:string|null):string{
 const map=new Map(locations.map(l=>[l.id,l])),parts:string[]=[];let current=id
 while(current&&parts.length<21){const l=map.get(current);if(!l)break;parts.unshift(l.name);current=l.parentId}
 return parts.join(' → ')
}
export function moveBottles(j:CollectionJournal,ids:string[],locationId:string|null,m:Mutation):CollectionJournal{
 let next=j
 for(const [i,id]of ids.entries()){const b=next.ownedBottles.find(b=>b.id===id);if(b)next=editBottle(next,{...b,locationId},b,{...m,id:`${m.id}:${i}`})}
 return next
}
