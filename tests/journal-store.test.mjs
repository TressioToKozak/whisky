import test from 'node:test'
import assert from 'node:assert/strict'
import {createJournalStore} from '../src/journal-store.ts'
import {emptyJournal,STORAGE_KEY,validateJournal,bottleWithQuantity} from '../src/model.ts'
function shared(initial=null){let value=initial;let tail=Promise.resolve();return{storage:{getItem:()=>value,setItem:(_,raw)=>{value=raw}},lock:task=>{const result=tail.then(task);tail=result.catch(()=>{});return result},raw:()=>value}}
const ids=['a','b']
test('legacy stock migrates without losing records; opened=true means one open bottle',()=>{
 const old={version:1,custom:[],reviews:[],wishlist:['b'],bottles:[{whiskyId:'a',quantity:4,opened:true},{whiskyId:'b',quantity:2,opened:false}]}
 const current=validateJournal(old,ids);assert.equal(current.version,2);assert.deepEqual(current.bottles,[{whiskyId:'a',quantity:4,openedCount:1},{whiskyId:'b',quantity:2,openedCount:0}]);assert.deepEqual(current.wishlist,old.wishlist);assert.equal(old.bottles[0].opened,true)
 assert.deepEqual(validateJournal(JSON.parse(JSON.stringify(current)),ids),current)
 for(const count of [-1,5,1.5,null,'1'])assert.throws(()=>validateJournal({...current,bottles:[{whiskyId:'a',quantity:4,openedCount:count}]},ids))
 assert.deepEqual(bottleWithQuantity({whiskyId:'a',quantity:4,openedCount:3},2),{whiskyId:'a',quantity:2,openedCount:2})
})
test('two tab writers serialize; stale state cannot silently replace a newer journal',async()=>{
 const sharedState=shared(JSON.stringify(emptyJournal()));const a=createJournalStore(sharedState.storage,sharedState.lock,ids),b=createJournalStore(sharedState.storage,sharedState.lock,ids)
 const [savedA,savedB]=await Promise.all([a.update(j=>({...j,wishlist:['a']})),b.update(j=>({...j,wishlist:['b']}))]);assert.equal(savedA,true);assert.equal(savedB,false)
 assert.deepEqual(JSON.parse(sharedState.raw()).wishlist,['a']);assert.deepEqual(b.getSnapshot().journal.wishlist,['a']);assert.deepEqual(b.getSnapshot().draft.wishlist,['b']);assert.match(b.getSnapshot().error,/innej karcie/)
 b.clearError();assert.equal(await b.update(j=>({...j,wishlist:[...j.wishlist,'b']})),true);a.reload();assert.deepEqual(a.getSnapshot().journal.wishlist,['a','b']);assert.equal(a.getSnapshot().remoteChanges,1)
})
test('same-tab rapid updates compose and external reads never echo writes',async()=>{
 const state=shared();const store=createJournalStore(state.storage,state.lock,ids);await store.initialize()
 await Promise.all([store.update(j=>({...j,wishlist:['a']})),store.update(j=>({...j,wishlist:[...j.wishlist,'b']}))]);assert.deepEqual(store.getSnapshot().journal.wishlist,['a','b']);const raw=state.raw();store.reload();assert.equal(state.raw(),raw)
})
test('corrupt storage is never overwritten by mutations; only confirmed valid replacement can restore it',async()=>{
 const state=shared('{corrupt');const store=createJournalStore(state.storage,state.lock,ids);await store.initialize();assert.equal(await store.update(j=>({...j,wishlist:['a']})),false);assert.equal(state.raw(),'{corrupt')
 assert.equal(await store.replace({...emptyJournal(),wishlist:['a']},store.getToken()),true);assert.deepEqual(JSON.parse(state.raw()).wishlist,['a'])
})
test('import confirmation rejects changed data and storage failures retain recoverable unsaved drafts',async()=>{
 const state=shared(JSON.stringify(emptyJournal()));const a=createJournalStore(state.storage,state.lock,ids),b=createJournalStore(state.storage,state.lock,ids);const token=a.getToken();await b.update(j=>({...j,wishlist:['b']}));a.reload()
 assert.equal(await a.replace({...emptyJournal(),wishlist:['a']},token),false);assert.deepEqual(JSON.parse(state.raw()).wishlist,['b'])
 const failing=createJournalStore({getItem:state.storage.getItem,setItem:()=>{throw Error('QuotaExceededError')}},state.lock,ids);assert.equal(await failing.update(j=>({...j,wishlist:['a']})),false);assert.deepEqual(failing.getSnapshot().draft.wishlist,['a']);assert.deepEqual(JSON.parse(state.raw()).wishlist,['b'])
})
test('unsupported cross-tab locking fails closed instead of risking data loss',async()=>{
 const state=shared(JSON.stringify(emptyJournal()));const store=createJournalStore(state.storage,null,ids);assert.equal(await store.update(j=>({...j,wishlist:['a']})),false);assert.deepEqual(JSON.parse(state.raw()).wishlist,[]);assert.match(store.getSnapshot().error,/przeglądarka/)
})
