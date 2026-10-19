import {createIndexedCollectionStore} from './indexed-collection'
import {useEffect,useMemo,useState,useSyncExternalStore} from 'react'
import {createCollectionStore} from './collection-store'
import {asLegacyJournal,COLLECTION_KEY} from './collection-model'
import {LEGACY_STORAGE_KEY,STORAGE_KEY} from './model'
export function useJournal(catalogIds:string[]){
 const [store]=useState(()=>{const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>localStorage.setItem(key,value),removeItem:(key:string)=>localStorage.removeItem(key),key:(i:number)=>localStorage.key(i),get length(){return localStorage.length}};return typeof indexedDB!=='undefined'?createIndexedCollectionStore(storage,catalogIds):createCollectionStore(storage,null,catalogIds)})
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot),[initializing,setInitializing]=useState(true)
 const journal=useMemo(()=>asLegacyJournal(snapshot.journal),[snapshot.journal])
 useEffect(()=>{
  const changed=(event:StorageEvent)=>{if(event.storageArea!==localStorage)return;if(event.key===LEGACY_STORAGE_KEY||event.key===STORAGE_KEY||event.key===COLLECTION_KEY)store.legacyChanged(event.key);else if(event.key==='dram.collection.revision'||event.key===null)store.reload()}
  const visible=()=>{if(!document.hidden)store.reload()}
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('dram-collection-changes'):null
  if(channel)channel.onmessage=()=>{void store.reload()}
  window.addEventListener('storage',changed);document.addEventListener('visibilitychange',visible)
  void store.initialize().finally(()=>setInitializing(false))
  return()=>{channel?.close();window.removeEventListener('storage',changed);document.removeEventListener('visibilitychange',visible)}
 },[store])
 return{...snapshot,journal,collection:snapshot.journal,store,initializing}
}
