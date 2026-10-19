import {createHash}from'node:crypto'
import test from 'node:test'
import assert from 'node:assert/strict'
import {IDBFactory} from 'fake-indexeddb'
import {createIndexedCollectionStore,openCollectionDatabase,COLLECTION_STORES} from '../src/indexed-collection.ts'
import {emptyCollection,COLLECTION_KEY} from '../src/collection-model.ts'
import {addBottles} from '../src/collection.ts'
const ids=['a','b'],m={id:'operation',at:'2026-10-19T12:00:00.000Z'}
function disk(raw){const map=new Map(raw?[[COLLECTION_KEY,raw]]:[]);return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size},map}}
const rows=async(factory,store)=>{const db=await openCollectionDatabase(factory);return new Promise((resolve,reject)=>{const t=db.transaction(store);const r=t.objectStore(store).getAll();t.oncomplete=()=>{db.close();resolve(r.result)};t.onabort=()=>reject(t.error)})}
test('atomic v3 migration preserves original raw and SHA, separates binary bytes and survives restart',async()=>{
 const factory=new IDBFactory(),journal=addBottles(emptyCollection(),'a',2,m)
 journal.ownedBottles[0].attachments=[{id:'pic',name:'pic.png',kind:'front',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6H2sAAAAASUVORK5CYII='}]
 const raw=JSON.stringify(journal),storage=disk(raw),a=createIndexedCollectionStore(storage,ids,factory)
 assert.equal(await a.initialize(),true);assert.equal(storage.getItem(COLLECTION_KEY),raw)
 const meta=await rows(factory,'metadata'),migration=meta.find(x=>x.id==='migration-v3')
 assert.equal(migration.complete,true);assert.equal(migration.sourceRaw,raw);assert.equal(migration.sha256,createHash('sha256').update(raw).digest('hex'))
 assert.equal(JSON.stringify(meta.find(x=>x.id==='journal')).includes('base64'),false)
 const files=await rows(factory,'attachments');assert.ok(files[0].bytes instanceof Uint8Array)
 assert.equal(await a.updateCollection(j=>addBottles(j,'b',1,{...m,id:'aaa-before-operation'})),true)
 assert.equal(storage.getItem(COLLECTION_KEY),raw)
 const b=createIndexedCollectionStore(storage,ids,factory);assert.equal(await b.initialize(),true)
 assert.deepEqual(b.getSnapshot().journal,a.getSnapshot().journal)
 const db=await openCollectionDatabase(factory);assert.deepEqual([...db.objectStoreNames].sort(),[...COLLECTION_STORES].sort());db.close()
})
test('two simultaneous startups migrate once; stale tab cannot overwrite canonical data',async()=>{
 const factory=new IDBFactory(),storage=disk(JSON.stringify(emptyCollection())),a=createIndexedCollectionStore(storage,ids,factory),b=createIndexedCollectionStore(storage,ids,factory)
 assert.deepEqual(await Promise.all([a.initialize(),b.initialize()]),[true,true])
 assert.equal(await a.updateCollection(j=>addBottles(j,'a',1,m)),true)
 assert.equal(await b.updateCollection(j=>addBottles(j,'b',1,{...m,id:'stale'})),false)
 assert.equal(b.getSnapshot().journal.ownedBottles[0].whiskyId,'a');assert.equal(b.getSnapshot().draft.ownedBottles[0].whiskyId,'b')
 await b.reload();assert.equal(await b.updateCollection(j=>addBottles(j,'b',1,{...m,id:'retry'})),true)
 await a.reload();assert.equal(a.getSnapshot().journal.ownedBottles.length,2)
})
test('aborted migration leaves no marker or partial data; restart retries safely',async()=>{
 const factory=new IDBFactory(),storage=disk(JSON.stringify(addBottles(emptyCollection(),'a',2,m))),original=factory.open.bind(factory)
 let abort=true
 factory.open=(...args)=>{const r=original(...args);r.addEventListener('success',()=>{const db=r.result,transaction=db.transaction.bind(db);db.transaction=(...params)=>{const tx=transaction(...params);if(abort&&params[1]==='readwrite'){const put=tx.objectStore('metadata').put.bind(tx.objectStore('metadata'));const objectStore=tx.objectStore.bind(tx);tx.objectStore=name=>{const s=objectStore(name);if(name==='metadata')s.put=(...p)=>{const result=put(...p);queueMicrotask(()=>{try{tx.abort()}catch{}});return result};return s}}return tx}});return r}
 const a=createIndexedCollectionStore(storage,ids,factory);assert.equal(await a.initialize(),false)
 assert.equal((await rows(factory,'metadata')).length,0);assert.equal((await rows(factory,'ownedBottles')).length,0)
 abort=false;const b=createIndexedCollectionStore(storage,ids,factory);assert.equal(await b.initialize(),true);assert.equal(b.getSnapshot().journal.ownedBottles.length,2)
})
test('corrupt canonical checksum blocks writes and does not reactivate stale localStorage',async()=>{
 const factory=new IDBFactory(),storage=disk(JSON.stringify(emptyCollection())),a=createIndexedCollectionStore(storage,ids,factory);await a.initialize()
 const db=await openCollectionDatabase(factory);await new Promise(resolve=>{const tx=db.transaction('metadata','readwrite');const r=tx.objectStore('metadata').get('journal');r.onsuccess=()=>tx.objectStore('metadata').put({...r.result,sha256:'bad'});tx.oncomplete=resolve});db.close()
 const b=createIndexedCollectionStore(storage,ids,factory);assert.equal(await b.initialize(),false)
 assert.equal(await b.updateCollection(j=>addBottles(j,'a',1,m)),false)
 assert.equal(b.getSnapshot().blocked,true)
 assert.equal(await b.replace(emptyCollection(),b.getToken()),true)
 const c=createIndexedCollectionStore(storage,ids,factory);assert.equal(await c.initialize(),true);assert.equal(c.getSnapshot().journal.ownedBottles.length,0)
})
test('existing binary files are references in durable intents and a second startup recovers them',async()=>{
 const factory=new IDBFactory(),j=addBottles(emptyCollection(),'a',1,m)
 j.ownedBottles[0].attachments=[{id:'pic',name:'pic.png',kind:'front',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6H2sAAAAASUVORK5CYII='}]
 const storage=disk(JSON.stringify(j)),a=createIndexedCollectionStore(storage,ids,factory);await a.initialize()
 const saving=a.updateCollection(j=>({...j,ownedBottles:j.ownedBottles.map(b=>({...b,notes:'durable'}))}))
 const intent=[...storage.map].find(([key])=>key.startsWith('dram.journal.pending.v3.'))[1]
 assert.ok(intent.includes('dram-binary:'));assert.ok(!intent.includes('base64'))
 const b=createIndexedCollectionStore(storage,ids,factory);await b.initialize();await saving;await b.reload()
 assert.equal(b.getSnapshot().journal.ownedBottles[0].notes,'durable');assert.equal(b.getSnapshot().journal.ownedBottles[0].attachments[0].data,j.ownedBottles[0].attachments[0].data)
})
test('quota failure during a write rolls back all rows and retains an exportable candidate',async()=>{
 const factory=new IDBFactory(),storage=disk(JSON.stringify(emptyCollection())),a=createIndexedCollectionStore(storage,ids,factory);await a.initialize()
 const original=factory.open.bind(factory);let abort=true
 factory.open=(...args)=>{const r=original(...args);r.addEventListener('success',()=>{const db=r.result,transaction=db.transaction.bind(db);db.transaction=(...params)=>{const tx=transaction(...params);if(abort&&params[1]==='readwrite'){const objectStore=tx.objectStore.bind(tx);tx.objectStore=name=>{const s=objectStore(name);if(name==='ownedBottles')s.put=()=>{throw new DOMException('Quota exceeded','QuotaExceededError')};return s}}return tx}});return r}
 assert.equal(await a.updateCollection(j=>addBottles(j,'a',1,m)),false);assert.equal(a.getSnapshot().journal.ownedBottles.length,0);assert.equal(a.getSnapshot().draft.ownedBottles.length,1)
 abort=false;const b=createIndexedCollectionStore(storage,ids,factory);await b.initialize();assert.equal(b.getSnapshot().journal.ownedBottles.length,0)
 assert.equal((await rows(factory,'events')).length,0)
})
