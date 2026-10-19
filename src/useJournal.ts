import { browserJournalLock } from './journal-lock'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createJournalStore } from './journal-store'
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './model'

export function useJournal(catalogIds: string[]) {
  const [store] = useState(() => createJournalStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}, typeof indexedDB !== 'undefined' ? browserJournalLock : null,catalogIds))
  const snapshot = useSyncExternalStore(store.subscribe,store.getSnapshot)
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.storageArea !== localStorage) return; if(event.key === LEGACY_STORAGE_KEY) store.legacyChanged(); else if(event.key === STORAGE_KEY || event.key === null) store.reload() }
    const visible = () => { if (!document.hidden) store.reload() }
    window.addEventListener('storage',changed); document.addEventListener('visibilitychange',visible)
    void store.initialize()
    return () => { window.removeEventListener('storage',changed); document.removeEventListener('visibilitychange',visible) }
  },[store])
  return { ...snapshot, store }
}
