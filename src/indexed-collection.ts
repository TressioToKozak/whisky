import {sha256}from'@noble/hashes/sha2.js'
import {bytesToHex,utf8ToBytes}from'@noble/hashes/utils.js'
import {createCollectionStore,collectionCodec} from './collection-store.ts'
import {COLLECTION_KEY,COLLECTION_PENDING,validateCollection} from './collection-model.ts'
import type {CollectionJournal} from './collection-model.ts'
import {JOURNAL_LOCK} from './journal-store.ts'
import type {JournalLock} from './journal-store.ts'

export const COLLECTION_DB='dram-collection'
export const COLLECTION_STORES=['metadata','ownedBottles','events','attachments','locations','pendingOperations'] as const
type BinaryRow={id:string;bottleId:string;fileId:string;mime:string;bytes:Uint8Array;hash:string}
const BINARY_REF='dram-binary:'
const dataBytes=(data:string)=>Uint8Array.from(atob(data.slice(data.indexOf(',')+1)),c=>c.charCodeAt(0))
const dataURL=(mime:string,bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return `data:${mime};base64,${btoa(s)}`}
export function openCollectionDatabase(factory:IDBFactory=indexedDB):Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  let abandoned=false
  const r=factory.open(COLLECTION_DB,1)
  r.onupgradeneeded=()=>{
   const db=r.result
   for(const name of COLLECTION_STORES){const store=db.createObjectStore(name,{keyPath:'id'});if(name==='ownedBottles')for(const [index,path]of [['release','whiskyId'],['status','status'],['location','locationId'],['purchaseDate','purchase.date']])store.createIndex(index,path);if(name==='events')store.createIndex('bottle','bottleId');if(name==='attachments')store.createIndex('bottle','bottleId')}
  }
  r.onerror=()=>reject(r.error)
  r.onblocked=()=>{abandoned=true;reject(Error('Zamknij starsze karty aplikacji i spróbuj ponownie.'))}
  r.onsuccess=()=>{if(abandoned){r.result.close();return}r.result.onversionchange=()=>r.result.close();resolve(r.result)}
 })
}
/** Working bottle rows reference binary records; the immutable migration copy keeps original JSON bytes. */
export function writeCollection(tx:IDBTransaction,journal:CollectionJournal,raw:string,migration?:{raw:string|null;sha256:string},retained:BinaryRow[]=[]){
 const {ownedBottles,events,locations,bottles:_,...common}=journal
 for(const name of COLLECTION_STORES.filter(n=>n!=='metadata'))tx.objectStore(name).clear()
 tx.objectStore('metadata').put({id:'journal',journal:common,sha256:collectionCodec.fingerprint!(raw),order:{ownedBottles:ownedBottles.map(x=>x.id),events:events.map(x=>x.id),locations:locations.map(x=>x.id)}})
 for(const file of retained)tx.objectStore('attachments').put({...file,id:`retained:${file.hash}`})
 if(migration)tx.objectStore('metadata').put({id:'migration-v3',complete:true,sourceRaw:migration.raw,sha256:migration.sha256,completedAt:new Date().toISOString()})
 for(const bottle of ownedBottles){
  const attachments=bottle.attachments.map(file=>{
   const {data,...metadata}=file
   const id=JSON.stringify([bottle.id,file.id])
   tx.objectStore('attachments').put({id,bottleId:bottle.id,fileId:file.id,mime:data.slice(5,data.indexOf(';')),bytes:dataBytes(data),hash:collectionCodec.fingerprint!(data)})
   return {...metadata,storageId:id}
  })
  tx.objectStore('ownedBottles').put({...bottle,attachments})
 }
 for(const event of events)tx.objectStore('events').put(event)
 for(const location of locations)tx.objectStore('locations').put(location)
}
export function readCollection(tx:IDBTransaction,ids:string[],done:(raw:string|null,files?:BinaryRow[])=>void,failed:(error:unknown)=>void){
 const names=['metadata','ownedBottles','events','attachments','locations'] as const
 const rows:Record<string,any[]>={};let left=names.length
 for(const name of names){const r=tx.objectStore(name).getAll();r.onsuccess=()=>{rows[name]=r.result;if(--left)return
  try{
   const meta=rows.metadata.find(x=>x.id==='journal');if(!meta){if(rows.metadata.length||rows.ownedBottles.length||rows.events.length||rows.attachments.length||rows.locations.length)throw Error('Brak metadanych kolekcji. Przywróć kopię danych.');done(null,[]);return}
   const files=new Map(rows.attachments.map(x=>[x.id,x]))
   const ownedBottles=rows.ownedBottles.map(b=>({...b,attachments:b.attachments.map((f:any)=>{const binary=files.get(f.storageId);if(!binary)throw Error('Brak załącznika w bazie.');const {storageId:_,...info}=f;return {...info,data:dataURL(binary.mime,binary.bytes)}})}))
   // Key order is canonical regardless of IndexedDB's primary-key ordering.
   const journal=validateCollection({...meta.journal,ownedBottles,events:rows.events,locations:rows.locations},ids)
   // Array order is part of the v3 API. Preserve it in metadata without duplicating rows.
   for(const field of ['ownedBottles','events','locations'] as const){const order=meta.order?.[field];if(order){const rank=new Map(order.map((id:string,i:number)=>[id,i]));journal[field].sort((a,b)=>(rank.get(a.id) as number)-(rank.get(b.id) as number))}}
   const raw=JSON.stringify(validateCollection(journal,ids))
   if(collectionCodec.fingerprint!(raw)!==meta.sha256)throw Error('Suma kontrolna kolekcji jest niezgodna. Przywróć kopię danych.')
   done(raw,rows.attachments as BinaryRow[])
  }catch(e){failed(e)}
 }}
}
export function createIndexedCollectionStore(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'|'key'|'length'>,ids:string[],factory:IDBFactory=indexedDB){
 let canonical:string|null=null,ready=false,loaded=false,repairing=false
 let committedFiles=new Map<string,string>(),fileRows:BinaryRow[]=[]
 const transformIntent=(value:string,compact:boolean)=>{const intent=JSON.parse(value);for(const bottle of intent.journal?.ownedBottles??[])for(const file of bottle.attachments??[]){if(compact){const hash=collectionCodec.fingerprint!(file.data);if(committedFiles.has(hash))file.data=BINARY_REF+hash}else if(file.data.startsWith(BINARY_REF)){const data=committedFiles.get(file.data.slice(BINARY_REF.length));if(!data)throw Error('Nie udało się odczytać załącznika oczekującej zmiany.');file.data=data}}return JSON.stringify(intent)}
 try{canonical=storage.getItem(COLLECTION_KEY)}catch{/* Safe store reports unavailable storage. */}
 const port={getItem:(key:string)=>key===COLLECTION_KEY?canonical:key.startsWith(COLLECTION_PENDING)?(()=>{const value=storage.getItem(key);return value===null?null:transformIntent(value,false)})():storage.getItem(key),setItem:(key:string,value:string)=>{if(key===COLLECTION_KEY)canonical=value;else storage.setItem(key,key.startsWith(COLLECTION_PENDING)?transformIntent(value,true):value)},removeItem:(key:string)=>storage.removeItem(key),key:(i:number)=>storage.key(i),get length(){return storage.length}}
 let store:ReturnType<typeof createCollectionStore>
 const transactionLock:JournalLock=async task=>{
  const db=await openCollectionDatabase(factory)
  const oldCanonical=canonical
  try{return await new Promise<boolean>((resolve,reject)=>{
   const tx=db.transaction([...COLLECTION_STORES],'readwrite');let result=false,committedRaw:string|null=null,changed=false
   const fail=(e:unknown)=>{try{tx.abort()}catch{/* already aborted */}reject(e)}
   tx.onabort=()=>reject(tx.error??Error('Nie udało się zapisać zmian w bazie.'))
   tx.oncomplete=()=>{if(committedRaw!==null){canonical=committedRaw;ready=true;loaded=true;for(const bottle of (JSON.parse(canonical) as CollectionJournal).ownedBottles)for(const file of bottle.attachments)committedFiles.set(collectionCodec.fingerprint!(file.data),file.data);store.reload();if(changed){try{storage.setItem('dram.collection.revision',collectionCodec.fingerprint!(canonical))}catch{/* IDB remains authoritative. */}if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('dram-collection-changes');channel.postMessage('committed');channel.close()}}}resolve(result)}
   const apply=(raw:string|null,repair=false)=>{
    try{
     const source=raw===null&&!repair?storage.getItem(COLLECTION_KEY):null
     canonical=repair?oldCanonical:raw??source;loaded=raw!==null
     result=task()
     if(result&&canonical!==null){
      committedRaw=JSON.stringify(validateCollection(JSON.parse(canonical),ids))
      if(repair||raw!==canonical||raw===null){
       changed=true
       canonical=committedRaw
       const journal=validateCollection(JSON.parse(canonical),ids)
       const pendingRefs=new Set<string>();let unknownIntent=false
       for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(COLLECTION_PENDING))continue;try{const intent=JSON.parse(storage.getItem(key)!);for(const bottle of intent.journal?.ownedBottles??[])for(const file of bottle.attachments??[])if(file.data.startsWith(BINARY_REF))pendingRefs.add(file.data.slice(BINARY_REF.length))}catch{unknownIntent=true}}
       writeCollection(tx,journal,canonical,raw===null&&!repair?{raw:storage.getItem(COLLECTION_KEY),sha256:bytesToHex(sha256(utf8ToBytes(storage.getItem(COLLECTION_KEY)??'')))}:undefined,fileRows.filter(file=>unknownIntent||pendingRefs.has(file.hash)))

      }
     }
    }catch(e){fail(e)}
   }
   readCollection(tx,ids,(raw,files=[])=>{fileRows=files;committedFiles=new Map(files.map(file=>[file.hash,dataURL(file.mime,file.bytes)]));apply(raw)},error=>{if(repairing){canonical=oldCanonical;apply(oldCanonical,true)}else{store.reportFailure(error instanceof Error?error.message:'Nie udało się odczytać kolekcji.',null,true);fail(error)}})
  })}catch(e){canonical=oldCanonical;store.reload();throw e}finally{db.close()}
 }
 const lock:JournalLock=async task=>typeof navigator!=='undefined'&&navigator.locks?navigator.locks.request(JOURNAL_LOCK,()=>transactionLock(task)):transactionLock(task)
 store=createCollectionStore(port,lock,ids)
 const initialize=store.initialize
 return {...store,
  replace:async(journal:CollectionJournal,token:string|null)=>{if(store.getSnapshot().pending)return false;repairing=true;try{return await store.replace(journal,token)}finally{repairing=false}},
  initialize:async()=>{const result=await initialize();if(result)ready=true;return result},
  reload:async()=>{if(!ready)return;try{await lock(()=>{store.reload();return true})}catch(e){store.reportFailure(e instanceof Error?e.message:'Nie udało się odczytać kolekcji.')}},
  legacyChanged:(key?:string)=>{if(loaded&&key===COLLECTION_KEY){try{const raw=storage.getItem(COLLECTION_KEY);if(raw)store.reportFailure('Starsza karta zmieniła zapis sprzed migracji. Aktualna kolekcja jest bezpieczna; pobierz oddzielną kopię tych zmian.',validateCollection(JSON.parse(raw),ids))}catch{store.reportFailure('Nie udało się odczytać zmian starszej karty.')}return}store.legacyChanged(key)},
 }
}
