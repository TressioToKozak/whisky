import {browserJournalLock} from './journal-lock'
import {useEffect,useMemo,useState,useSyncExternalStore} from 'react'
import {createCollectionStore} from './collection-store'
import {asLegacyJournal,COLLECTION_KEY} from './collection-model'
import {LEGACY_STORAGE_KEY,STORAGE_KEY} from './model'
export function useJournal(catalogIds:string[]){
 const [store]=useState(()=>createCollectionStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key),key:i=>localStorage.key(i),get length(){return localStorage.length}},typeof indexedDB!=='undefined'?browserJournalLock:null,catalogIds))
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot),[initializing,setInitializing]=useState(true)
 const journal=useMemo(()=>asLegacyJournal(snapshot.journal),[snapshot.journal])
 useEffect(()=>{
  const changed=(event:StorageEvent)=>{if(event.storageArea!==localStorage)return;if(event.key===LEGACY_STORAGE_KEY||event.key===STORAGE_KEY)store.legacyChanged(event.key);else if(event.key===COLLECTION_KEY||event.key===null)store.reload()}
  const visible=()=>{if(!document.hidden)store.reload()}
  window.addEventListener('storage',changed);document.addEventListener('visibilitychange',visible)
  void store.initialize().finally(()=>setInitializing(false))
  return()=>{window.removeEventListener('storage',changed);document.removeEventListener('visibilitychange',visible)}
 },[store])
 return{...snapshot,journal,collection:snapshot.journal,store,initializing}
}
