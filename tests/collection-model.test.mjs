import test from 'node:test'
import assert from 'node:assert/strict'
import {emptyJournal}from'../src/model.ts'
import {validateCollection,emptyCollection,blankBottle,asLegacyJournal,stockProjection,COLLECTION_KEY}from'../src/collection-model.ts'
import {addBottles,editBottle,applyLegacyChange,moveBottles}from'../src/collection.ts'
import {collectionFinance}from'../src/collection-finance.ts'
import {createCollectionStore,collectionCodec}from'../src/collection-store.ts'
import {createJournalStore}from'../src/journal-store.ts'
const ids=['a','b'],m={id:'operation',at:'2026-10-19T12:00:00.000Z'}
function disk(entries={}){const map=new Map(Object.entries(entries));return{getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v)},removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size},map}}
const lock=async f=>f()
test('v1 and v2 migrate deterministically and v3 validates idempotently with unknown facts retained',()=>{
 for(const legacy of [{...emptyJournal(),version:1,bottles:[{whiskyId:'a',quantity:5,opened:true}]},{...emptyJournal(),bottles:[{whiskyId:'a',quantity:5,openedCount:2}]}]){
  const v3=validateCollection(legacy,ids);assert.equal(v3.version,3);assert.equal(v3.ownedBottles.length,5);assert.equal(new Set(v3.ownedBottles.map(b=>b.id)).size,5);assert.equal(v3.ownedBottles.filter(b=>b.status==='open').length,legacy.version===1?1:2)
  for(const b of v3.ownedBottles){assert.equal(b.purchase.amount,null);assert.equal(b.purchase.currency,null);assert.equal(b.purchase.date,null);assert.equal(b.remainingMl,null);assert.equal(b.createdAt,null)}assert.deepEqual(v3.events,[]);assert.deepEqual(validateCollection(v3,ids),v3);assert.deepEqual(validateCollection(legacy,ids),v3)
 }
})
test('physical stock drives the legacy projection; counter changes preserve individual metadata and archive withdrawals',()=>{
 let j=addBottles(emptyCollection(),'a',5,m);const b=j.ownedBottles[0];j=editBottle(j,{...b,purchase:{kind:'purchase',amount:25,currency:'EUR',date:'2026-10-19',place:'Shop'},notes:'keep'},b,{...m,id:'edit'})
 j=applyLegacyChange(j,{...asLegacyJournal(j),bottles:[{whiskyId:'a',quantity:4,openedCount:2}]},{...m,id:'counter'})
 assert.equal(j.ownedBottles.length,5);assert.equal(j.ownedBottles.filter(b=>b.status==='archived').length,1);assert.equal(j.ownedBottles[0].notes,'keep');assert.equal(j.ownedBottles[0].purchase.amount,25);assert.deepEqual(stockProjection(j.ownedBottles),[{whiskyId:'a',quantity:4,openedCount:2}]);assert.ok(j.events.some(e=>e.kind==='status'))
})
test('edits cannot silently replace a stale bottle; events omit binary attachment payloads',()=>{
 const j=addBottles(emptyCollection(),'a',1,m),old=j.ownedBottles[0],next=editBottle(j,{...old,notes:'new'},old,{...m,id:'edit'})
 assert.throws(()=>editBottle(next,{...old,notes:'stale'},old,{...m,id:'stale'}),/innej karcie/)
 const attachment={id:'front',kind:'front',name:'front.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6H2sAAAAASUVORK5CYII='};const edited=editBottle(j,{...old,attachments:[attachment]},old,{...m,id:'photo'})
 assert.ok(!JSON.stringify(edited.events).includes('base64'));assert.equal(validateCollection(edited,ids).ownedBottles[0].attachments[0].data,attachment.data)
})
test('v3 rejects invalid money, dates, attachments, duplicate IDs, status and location cycles',()=>{
 const valid=addBottles(emptyCollection(),'a',1,m),b=valid.ownedBottles[0]
 for(const change of [{status:'fake'},{purchase:{...b.purchase,kind:'purchase',amount:-1}},{openedAt:'2026-02-30'},{remainingMl:1,remainingPercent:50},{status:'empty',remainingMl:null},{locationId:'missing'},{attachments:[{id:'x',kind:'front',name:'a.svg',data:'data:image/svg+xml;base64,YQ=='}]}])assert.throws(()=>validateCollection({...valid,ownedBottles:[{...b,...change}]},ids))
 assert.throws(()=>validateCollection({...valid,ownedBottles:[b,b]},ids));assert.throws(()=>validateCollection({...valid,locations:[{id:'x',name:'A',parentId:'y',kind:'room'},{id:'y',name:'B',parentId:'x',kind:'shelf'}]},ids))
 assert.throws(()=>validateCollection({...valid,ownedBottles:[{...b,whiskyId:'jw-001',remainingMl:800}]},['jw-001']))
})
test('locations and bulk moves preserve provenance, purchase metadata and per-bottle history',()=>{
 let j=addBottles(emptyCollection(),'a',2,m);j.locations=[{id:'room',name:'Salon',kind:'room',parentId:null},{id:'shelf',name:'Półka 3',kind:'shelf',parentId:'room'}];j=moveBottles(j,j.ownedBottles.map(b=>b.id),'shelf',{...m,id:'move'});assert.equal(j.events.filter(e=>e.kind==='moved').length,2);assert.ok(validateCollection(j,ids).ownedBottles.every(b=>b.locationId==='shelf'))
})
test('costs, gifts, missing facts and actual sales are separate and currencies never mixed',()=>{
 let j=addBottles(emptyCollection(),'a',4,m);j.ownedBottles[0].purchase={kind:'purchase',amount:20,currency:'EUR',date:null,place:''};j.ownedBottles[1].purchase={kind:'purchase',amount:100,currency:'PLN',date:null,place:''};j.ownedBottles[2].purchase.kind='gift';let f=collectionFinance(j.ownedBottles,{a:{amount:30}});assert.equal(f.costUnknown,1);assert.equal(f.gifts,1);assert.deepEqual(f.costs.map(r=>r.amount),[20,100]);assert.equal(f.wholeBottleReference.amount,120)
 j.ownedBottles[0].status='sold';j.ownedBottles[0].sale={date:null,amount:40,currency:'EUR',fees:null};f=collectionFinance(j.ownedBottles,{});assert.equal(f.saleGross[0].amount,40);assert.equal(f.saleNet.length,0);assert.equal(f.realised.length,0);j.ownedBottles[0].sale.fees=5;f=collectionFinance(j.ownedBottles,{});assert.equal(f.saleNet[0].amount,35);assert.equal(f.realised[0].amount,15)
})
test('simultaneous v3 initialization creates one deterministic migration and retains both old keys',async()=>{
 const old={...emptyJournal(),bottles:[{whiskyId:'a',quantity:5,openedCount:2}]},raw=JSON.stringify(old),storage=disk({'dram.journal.v2':raw,'dram.journal.v1':'retained'})
 let tail=Promise.resolve();const serial=f=>{const r=tail.then(f);tail=r.catch(()=>{});return r};const a=createCollectionStore(storage,serial,ids),b=createCollectionStore(storage,serial,ids);await Promise.all([a.initialize(),b.initialize()]);a.reload();b.reload();assert.deepEqual(a.getSnapshot().journal,b.getSnapshot().journal);assert.equal(JSON.parse(storage.getItem(COLLECTION_KEY)).ownedBottles.length,5);assert.equal(storage.getItem('dram.journal.v2'),raw);assert.equal(storage.getItem('dram.journal.v1'),'retained')
})
test('interrupted v3 changes recover without duplicate instances; older app writes cannot replace v3',async()=>{
 const storage=disk(),a=createCollectionStore(storage,lock,ids);await a.initialize();await a.update(j=>({...j,bottles:[{whiskyId:'a',quantity:2,openedCount:1}]}));const raw=storage.getItem(COLLECTION_KEY);storage.setItem('dram.journal.v2',JSON.stringify(emptyJournal()));a.legacyChanged('dram.journal.v2');assert.equal(storage.getItem(COLLECTION_KEY),raw)
 const stalled=createJournalStore(storage,()=>new Promise(()=>{}),ids,collectionCodec);void stalled.update(j=>addBottles(j,'b',2,{...m,id:'recover'}));const fresh=createCollectionStore(storage,lock,ids);await fresh.initialize();assert.equal(fresh.getSnapshot().journal.ownedBottles.length,4);assert.equal(new Set(fresh.getSnapshot().journal.ownedBottles.map(b=>b.id)).size,4)
})
test('legacy migration preserves arbitrary valid custom IDs and all existing personal data',()=>{
 const w={id:'custom-odds / ł',name:'Private',brand:'Mine',series:'',category:'Klasyka',abv:null,age:null,volume:null,country:'',description:'My note',image:'',source:'',imageSource:'',tags:[]}
 const old={...emptyJournal(),custom:[w],bottles:[{whiskyId:w.id,quantity:2,openedCount:1}],wishlist:[w.id],reviews:[{id:'r',whiskyId:w.id,score:9,note:'unchanged',date:'2026-10-19',tags:['Personal tag']}]};const j=validateCollection(old,ids);assert.equal(j.ownedBottles[0].whiskyId,w.id);assert.deepEqual(validateCollection(j,ids),j);assert.equal(j.reviews[0].note,'unchanged');assert.deepEqual(j.reviews[0].tags,['Personal tag']);assert.deepEqual(j.wishlist,[w.id])
})
test('v3 ignores forged aggregate counters and requires currency for known costs',()=>{
 const j=addBottles(emptyCollection(),'a',2,m);assert.equal(validateCollection({...j,bottles:[{whiskyId:'a',quantity:999,openedCount:999}]},ids).bottles[0].quantity,2)
 assert.throws(()=>validateCollection({...j,ownedBottles:[{...j.ownedBottles[0],purchase:{kind:'purchase',amount:20,currency:null,date:null,place:''}}]},ids),/waluty/)
})
test('a failed migration retains exact legacy bytes; interrupted v2 intents are recovered before migration',async()=>{
 const raw=JSON.stringify({...emptyJournal(),bottles:[{whiskyId:'a',quantity:2,openedCount:1}]}),storage=disk({'dram.journal.v2':raw});const failing={...storage,get length(){return storage.length},setItem:(key,value)=>{if(key===COLLECTION_KEY)throw Error('quota');storage.setItem(key,value)}};const a=createCollectionStore(failing,lock,ids);assert.equal(await a.initialize(),false);assert.equal(storage.getItem('dram.journal.v2'),raw);assert.equal(storage.getItem(COLLECTION_KEY),null)
 const old=createJournalStore(storage,()=>new Promise(()=>{}),ids);void old.update(j=>({...j,bottles:[{whiskyId:'a',quantity:3,openedCount:1}]}));const fresh=createCollectionStore(storage,lock,ids);await fresh.initialize();assert.equal(fresh.getSnapshot().journal.ownedBottles.length,3);assert.equal(fresh.getSnapshot().journal.bottles[0].openedCount,1)
})
test('older-version pending changes recovered after v3 exists stay a separate downloadable variant',async()=>{
 const storage=disk(),current=createCollectionStore(storage,lock,ids);await current.initialize();await current.update(j=>({...j,bottles:[{whiskyId:'a',quantity:2,openedCount:1}]}));const raw=storage.getItem(COLLECTION_KEY)
 const older=createJournalStore(storage,()=>new Promise(()=>{}),ids);void older.update(j=>({...j,wishlist:['b']}));const refreshed=createCollectionStore(storage,lock,ids);await refreshed.initialize();assert.equal(storage.getItem(COLLECTION_KEY),raw);assert.deepEqual(refreshed.getSnapshot().draft.wishlist,['b']);assert.match(refreshed.getSnapshot().error,/Starsza wersja/)
})
test('transaction money rejects unsupported fractional cents and false image headers',()=>{
 const j=addBottles(emptyCollection(),'a',1,m),b=j.ownedBottles[0]
 assert.throws(()=>validateCollection({...j,ownedBottles:[{...b,purchase:{kind:'purchase',amount:12.345,currency:'EUR',date:null,place:''}}]},ids))
 assert.throws(()=>validateCollection({...j,ownedBottles:[{...b,attachments:[{id:'fake',name:'image.png',kind:'front',data:'data:image/png;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+'}]}]},ids))
})
test('v3 durable intents use SHA-256 without duplicating the complete baseline and recover by exact fingerprint',async()=>{
 const j=addBottles(emptyCollection(),'a',100,m);j.ownedBottles=j.ownedBottles.map(b=>({...b,notes:'x'.repeat(2000)}));const raw=JSON.stringify(j),storage=disk({[COLLECTION_KEY]:raw}),stalled=createJournalStore(storage,()=>new Promise(()=>{}),ids,collectionCodec)
 void stalled.update(state=>({...state,wishlist:['b']}));const key=[...storage.map.keys()].find(k=>k.startsWith('dram.journal.pending.v3.')),pending=storage.getItem(key),intent=JSON.parse(pending);assert.equal(intent.baseRaw,undefined);assert.match(intent.baseFingerprint,/^[a-f0-9]{64}$/);assert.ok(pending.length<raw.length*1.05)
 const fresh=createCollectionStore(storage,lock,ids);await fresh.initialize();assert.deepEqual(fresh.getSnapshot().journal.wishlist,['b']);assert.equal(fresh.getSnapshot().journal.ownedBottles.length,100)
})
