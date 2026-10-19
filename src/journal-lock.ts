import { JOURNAL_LOCK } from './journal-store'

/** Every writer uses the same IDB read/write transaction, including browsers without Web Locks. */
export function indexedJournalLock(task: () => boolean): Promise<boolean> {
  return new Promise((resolve,reject) => {
    let result = false, ran = false, abandoned = false
    const opening = indexedDB.open('dram-journal-coordination',1)
    opening.onupgradeneeded = () => { if (!opening.result.objectStoreNames.contains('journal')) opening.result.createObjectStore('journal') }
    opening.onerror = () => reject(opening.error)
    opening.onblocked = () => {abandoned=true;reject(Error('Journal coordination database is blocked'))}
    opening.onsuccess = () => {
      const db = opening.result; if(abandoned){db.close();return} db.onversionchange = () => db.close()
      let transaction: IDBTransaction
      try {transaction = db.transaction('journal','readwrite')}catch(error){db.close();reject(error);return}
      const request = transaction.objectStore('journal').get('writer')
      request.onsuccess = () => {
        // The transaction's exclusive store lock spans this synchronous compare-and-write.
        try { result = task(); ran = true } catch (error) { transaction.abort(); reject(error) }
      }
      transaction.oncomplete = () => { db.close(); resolve(result) }
      transaction.onabort = transaction.onerror = () => {
        db.close()
        // A completed synchronous critical section already wrote localStorage safely.
        if (ran) resolve(result); else reject(transaction.error ?? Error('Journal coordination failed'))
      }
    }
  })
}
export const browserJournalLock = async (task: () => boolean): Promise<boolean> => navigator.locks
  ? navigator.locks.request(JOURNAL_LOCK,() => indexedJournalLock(task))
  : indexedJournalLock(task)
