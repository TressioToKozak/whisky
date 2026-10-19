import { emptyJournal, LEGACY_STORAGE_KEY, STORAGE_KEY, validateJournal } from './model.ts'
import type { Journal } from './model.ts'

type StoragePort = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage,'removeItem'|'key'|'length'>>
export type JournalLock = (task: () => boolean) => Promise<boolean>
export type JournalSnapshot = { journal: Journal; error: string; blocked: boolean; draft: Journal | null; remoteChanges: number; pending: number }
export const JOURNAL_LOCK = 'dram.journal.write.v2'
export const INTENT_PREFIX = 'dram.journal.pending.v1.'
const readError = 'Nie udało się odczytać dziennika. Dotychczasowy zapis nie zostanie nadpisany.'
const conflictError = 'Dziennik zmienił się w innej karcie. Ta operacja nie została zapisana. Pokazujemy aktualne dane. Możesz pobrać kopię niezapisanych zmian i ponowić operację.'

export class JournalDraftConflict extends Error {
  draft: Journal
  constructor(message: string, draft: Journal) { super(message); this.draft = draft }
}

/** localStorage remains the journal format. Web Locks serialize check-and-write across tabs. */
export function createJournalStore(storage: StoragePort, lock: JournalLock | null, catalogIds: string[]) {
  let baseline: string | null = null, generation = 0, queue = Promise.resolve(true)
  let snapshot: JournalSnapshot = { journal: emptyJournal(), error: '', blocked: false, draft: null, remoteChanges: 0, pending: 0 }
  let failureRevision = 0
  let projected: Journal | null = null, projectedRaw: string | null = null, sequence = 0
  const owner = `${Date.now()}.${Math.random().toString(36).slice(2)}`
  const durable = Boolean(storage.removeItem && storage.key)
  const recoveredConflicts = new Set<string>()
  const listeners = new Set<() => void>()
  const emit = (patch: Partial<JournalSnapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()) }
  const fail = (patch: Partial<JournalSnapshot>) => {failureRevision++;emit(patch)}
  const decode = (raw: string | null) => raw === null ? emptyJournal() : validateJournal(JSON.parse(raw), catalogIds)
  const diskRaw = () => storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY)
  try { baseline = diskRaw(); snapshot.journal = decode(baseline) }
  catch { snapshot.error = readError; snapshot.blocked = true }

  function reload() {
    try {
      const raw = diskRaw()
      if (raw === baseline) return
      generation++; baseline = raw
      const journal = decode(raw)
      emit({ journal, blocked: false, remoteChanges: snapshot.remoteChanges + 1, ...(snapshot.blocked ? {error:''} : {}) })
    } catch { fail({error:readError,blocked:true}) }
  }
  function update(recipe: (journal: Journal) => Journal, options?: { replacement?: boolean; expectedRaw?: string | null }) {
    const requestedGeneration = generation, requestedFailureRevision = failureRevision
    let intentKey: string | null = null, queuedCandidate: Journal | null = null
    // Persist the complete proposed result synchronously BEFORE the first promise/lock.
    // Consecutive intents form an exact compare-and-write chain, including removals/imports.
    if (durable && lock && (!snapshot.blocked || options?.replacement)) {
      try {
        const base = projected ?? snapshot.journal
        const candidate = validateJournal(recipe(base),catalogIds);queuedCandidate=candidate
        const baseRaw = projected ? projectedRaw : baseline
        intentKey = `${INTENT_PREFIX}${owner}.${String(++sequence).padStart(8,'0')}`
        storage.setItem(intentKey,JSON.stringify({baseRaw,replacement:Boolean(options?.replacement),expectedRaw:options && 'expectedRaw' in options ? options.expectedRaw : baseRaw,journal:candidate}))
        projected=candidate;projectedRaw=JSON.stringify(candidate)
      } catch (error) {
        let draft: Journal | null = queuedCandidate
        if(error instanceof JournalDraftConflict) {try{draft=validateJournal(error.draft,catalogIds)}catch{/* Form retains invalid content. */}}
        fail({error:error instanceof JournalDraftConflict ? error.message : 'Nie udało się zabezpieczyć oczekującej zmiany. Dotychczasowe dane pozostały bez zmian.',draft})
        return Promise.resolve(false)
      }
    }
    emit({pending:snapshot.pending+1})
    const operation = async (): Promise<boolean> => {
      if (!lock) { fail({error:'Ta przeglądarka nie obsługuje bezpiecznego zapisu między kartami. Pobierz kopię i otwórz aplikację w aktualnej przeglądarce przez HTTPS.'}); return false }
      try {
        return await lock(() => {
          if(intentKey && storage.getItem(intentKey)===null) {reload();return true} // Another startup safely recovered it.

          if (snapshot.blocked && !options?.replacement) return false
          let candidate: Journal
          try { candidate = validateJournal(recipe(snapshot.journal), catalogIds) }
          catch (error) {
            let draft: Journal | null = null
            if (error instanceof JournalDraftConflict) { try {draft=validateJournal(error.draft,catalogIds)} catch {/* The open form still holds invalid or removed-record content. */} }
            fail({error:error instanceof Error ? error.message : 'Nie udało się zapisać zmian.',draft}); return false
          }
          const raw = diskRaw()
          if (raw !== baseline || requestedGeneration !== generation || (options && 'expectedRaw' in options && raw !== options.expectedRaw)) {
            baseline = raw; generation++
            try { fail({journal:decode(raw),blocked:false,error:conflictError,draft:candidate,remoteChanges:snapshot.remoteChanges+1}) }
            catch { fail({error:readError,blocked:true,draft:candidate}) }
            return false
          }
          // No await between the comparison and write. The cross-tab lock remains held.
          const next = JSON.stringify(candidate)
          try { storage.setItem(STORAGE_KEY,next) }
          catch { fail({error:'Nie udało się zapisać zmian. Sprawdź wolne miejsce i spróbuj ponownie.',draft:candidate}); return false }
          baseline = next
          emit({journal:candidate,blocked:false,...(failureRevision===requestedFailureRevision ? {error:'',draft:null} : {})})
          return true
        })
      } catch { fail({error:'Nie udało się uzyskać dostępu do zapisu. Dotychczasowe dane pozostały bez zmian.',draft:queuedCandidate}); return false }
    }
    const finish = async () => {
      try { return await operation() }
      finally {
        if(intentKey) {try{storage.removeItem?.(intentKey)}catch{/* An applied intent is recognised on recovery. */}}
        if(snapshot.pending===1){projected=null;projectedRaw=null}
        emit({pending:snapshot.pending-1})
      }
    }
    queue = queue.then(finish,finish)
    return queue
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => {listeners.delete(listener)} },
    getToken: () => baseline,
    getRaw: diskRaw,
    legacyChanged: () => {
      try {
        if (storage.getItem(STORAGE_KEY) === null) {reload();return}
        const legacy = storage.getItem(LEGACY_STORAGE_KEY)
        if (legacy !== null) fail({error:'Starsza wersja aplikacji zmieniła poprzedni zapis dziennika. Aktualne dane są bezpieczne. Pobierz kopię tych zmian, a następnie porównaj ją lub przywróć przez import.',draft:decode(legacy)})
      } catch {fail({error:'Starsza karta zmieniła poprzedni zapis. Aktualny dziennik pozostał bez zmian.'})}
    },
    reload,
    update,
    replace: (journal: Journal, expectedRaw: string | null) => update(() => journal,{replacement:true,expectedRaw}),
    initialize: async () => {
      if (!lock) return false
      try {return await lock(() => {
        reload()
        if(durable) {
          let recoveryFailed = false
          const keys = Array.from({length:storage.length ?? 0},(_,i)=>storage.key!(i)).filter((key):key is string=>Boolean(key?.startsWith(INTENT_PREFIX))).sort()
          for(const key of keys) {
            try {
              const intent=JSON.parse(storage.getItem(key)!), candidate=validateJournal(intent.journal,catalogIds), next=JSON.stringify(candidate), raw=diskRaw()
              if(raw===next) {storage.removeItem!(key);continue}
              if(snapshot.blocked && !intent.replacement) {recoveryFailed=true;recoveredConflicts.add(key);fail({error:readError,draft:candidate});continue}
              if(raw!==intent.baseRaw || raw!==intent.expectedRaw) {
                recoveryFailed=true;recoveredConflicts.add(key)
                fail({error:conflictError,draft:candidate});continue
              }
              storage.setItem(STORAGE_KEY,next);baseline=next;storage.removeItem!(key)
              emit({journal:candidate,blocked:false,...(!recoveryFailed ? {error:'Odzyskano zmianę przerwaną przy zamykaniu strony.'} : {})})
            } catch {recoveryFailed=true;fail({error:'Nie udało się odzyskać oczekującej zmiany. Kopia oczekującego zapisu pozostała zachowana.'})}
          }
        }
        if(snapshot.blocked)return false
        if (storage.getItem(STORAGE_KEY) !== null && baseline !== null && JSON.parse(baseline).version === 2) return true
        const next = JSON.stringify(snapshot.journal)
        storage.setItem(STORAGE_KEY,next);baseline=next;return true
      })} catch {fail({error:'Nie udało się zapisać zmian. Sprawdź wolne miejsce i spróbuj ponownie.'});return false}
    },
    clearError: () => { if (!snapshot.blocked) {for(const key of recoveredConflicts){try{storage.removeItem?.(key)}catch{/* Preserve if unavailable. */}}recoveredConflicts.clear();fail({error:'',draft:null})} },
  }
}
