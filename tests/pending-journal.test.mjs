import test from 'node:test'
import assert from 'node:assert/strict'
import {createJournalStore,INTENT_PREFIX} from '../src/journal-store.ts'
import {emptyJournal,STORAGE_KEY} from '../src/model.ts'
function disk(j=emptyJournal()){
 const map=new Map([[STORAGE_KEY,JSON.stringify(j)]])
 return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size},map}
}
const ids=['a','b'],lock=async task=>task()
const add=j=>({...j,bottles:[...j.bottles,{whiskyId:'a',quantity:1,openedCount:0}]})
const increment=j=>({...j,bottles:j.bottles.map(b=>({...b,quantity:b.quantity+1}))})
test('intent is durable synchronously; a fresh store recovers an interrupted add and rapid increments',async()=>{
 const storage=disk(),stalled=()=>new Promise(()=>{}),a=createJournalStore(storage,stalled,ids)
 void a.update(add);void a.update(increment);void a.update(increment)
 assert.equal([...storage.map.keys()].filter(k=>k.startsWith(INTENT_PREFIX)).length,3)
 assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).bottles.length,0)
 const reloaded=createJournalStore(storage,lock,ids);assert.equal(await reloaded.initialize(),true);assert.equal(reloaded.getSnapshot().journal.bottles[0].quantity,3)
 assert.equal([...storage.map.keys()].filter(k=>k.startsWith(INTENT_PREFIX)).length,0)
})
test('queued same-tab changes commit in order and remove durable intents only after completion',async()=>{
 const storage=disk(),a=createJournalStore(storage,lock,ids)
 const operations=[a.update(add),a.update(increment),a.update(j=>({...j,bottles:j.bottles.map(b=>({...b,openedCount:2}))})),a.update(j=>({...j,wishlist:['b']}))]
 assert.equal(a.getSnapshot().pending,4);assert.deepEqual(await Promise.all(operations),[true,true,true,true]);assert.equal(a.getSnapshot().pending,0)
 assert.deepEqual(a.getSnapshot().journal.bottles,[{whiskyId:'a',quantity:2,openedCount:2}]);assert.deepEqual(a.getSnapshot().journal.wishlist,['b']);assert.equal(storage.length,1)
})
test('interrupted decrement and review/wish updates survive reload with exact contents',async()=>{
 const storage=disk({...emptyJournal(),bottles:[{whiskyId:'a',quantity:4,openedCount:1}]}),a=createJournalStore(storage,()=>new Promise(()=>{}),ids)
 void a.update(j=>({...j,bottles:[{...j.bottles[0],quantity:3,openedCount:2}]}));void a.update(j=>({...j,wishlist:['b'],reviews:[{id:'r',whiskyId:'a',score:8.5,note:'keep',tags:['Dym'],date:'2026-10-19'}]}))
 const b=createJournalStore(storage,lock,ids);await b.initialize();assert.equal(b.getSnapshot().journal.bottles[0].quantity,3);assert.equal(b.getSnapshot().journal.bottles[0].openedCount,2);assert.equal(b.getSnapshot().journal.reviews[0].note,'keep');assert.deepEqual(b.getSnapshot().journal.wishlist,['b'])
})
test('newer disk state prevents recovery from silently overwriting and retains downloadable draft',async()=>{
 const storage=disk(),a=createJournalStore(storage,()=>new Promise(()=>{}),ids);void a.update(j=>({...j,wishlist:['a']}));storage.setItem(STORAGE_KEY,JSON.stringify({...emptyJournal(),wishlist:['b']}))
 const b=createJournalStore(storage,lock,ids);await b.initialize();assert.deepEqual(b.getSnapshot().journal.wishlist,['b']);assert.deepEqual(b.getSnapshot().draft.wishlist,['a']);assert.match(b.getSnapshot().error,/innej karcie/);assert.equal(storage.length,2);b.clearError();assert.equal(storage.length,1)
})
test('already-applied intents are idempotent; malformed pending data cannot replace the journal',async()=>{
 const storage=disk(),a=createJournalStore(storage,()=>new Promise(()=>{}),ids);void a.update(add)
 const key=[...storage.map.keys()].find(k=>k.startsWith(INTENT_PREFIX));storage.setItem(STORAGE_KEY,JSON.stringify(JSON.parse(storage.getItem(key)).journal))
 const b=createJournalStore(storage,lock,ids);await b.initialize();assert.equal(b.getSnapshot().journal.bottles[0].quantity,1);assert.equal(storage.length,1)
 storage.setItem(INTENT_PREFIX+'bad','{"journal":{}}');const c=createJournalStore(storage,lock,ids);await c.initialize();assert.equal(c.getSnapshot().journal.bottles[0].quantity,1);assert.match(c.getSnapshot().error,/odzyskać/)
})
test('quota while staging an intent rejects before claiming success or changing the journal',async()=>{
 const storage=disk(),a=createJournalStore({...storage,key:storage.key,get length(){return storage.length},setItem:()=>{throw Error('quota')}},lock,ids)
 assert.equal(await a.update(add),false);assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).bottles.length,0);assert.equal(a.getSnapshot().draft.bottles.length,1);assert.equal(a.getSnapshot().pending,0)
})
test('confirmed replacement interrupted on corrupt storage can recover; ordinary mutations cannot',async()=>{
 const storage=disk();storage.setItem(STORAGE_KEY,'{broken');const a=createJournalStore(storage,()=>new Promise(()=>{}),ids)
 void a.replace({...emptyJournal(),wishlist:['b']},a.getToken());const b=createJournalStore(storage,lock,ids);await b.initialize();assert.equal(b.getSnapshot().blocked,false);assert.deepEqual(b.getSnapshot().journal.wishlist,['b'])
})
test('a later staging failure stays visible when an earlier queued write succeeds',async()=>{
 const storage=disk();let release
 const blocked=task=>new Promise(resolve=>{release=()=>resolve(task())})
 const a=createJournalStore(storage,blocked,ids),first=a.update(add)
 await Promise.resolve()
 const set=storage.setItem;storage.setItem=(key,value)=>{if(key.startsWith(INTENT_PREFIX))throw Error('quota');set(key,value)}
 assert.equal(await a.update(increment),false);assert.match(a.getSnapshot().error,/oczekującej/)
 release();assert.equal(await first,true);assert.match(a.getSnapshot().error,/oczekującej/);assert.equal(a.getSnapshot().draft.bottles[0].quantity,2);assert.equal(a.getSnapshot().journal.bottles[0].quantity,1)
})
test('recovering a later valid chain does not mask an earlier conflicting pending draft',async()=>{
 const storage=disk(),base=storage.getItem(STORAGE_KEY)
 storage.setItem(INTENT_PREFIX+'1',JSON.stringify({baseRaw:'stale',expectedRaw:'stale',journal:{...emptyJournal(),wishlist:['a']}}))
 storage.setItem(INTENT_PREFIX+'2',JSON.stringify({baseRaw:base,expectedRaw:base,journal:{...emptyJournal(),wishlist:['b']}}))
 const a=createJournalStore(storage,lock,ids);await a.initialize();assert.deepEqual(a.getSnapshot().journal.wishlist,['b']);assert.deepEqual(a.getSnapshot().draft.wishlist,['a']);assert.match(a.getSnapshot().error,/innej karcie/)
})
