import { emptyJournal, LEGACY_STORAGE_KEY, STORAGE_KEY, validateJournal } from './model.ts'
import type { Journal } from './model.ts'

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
export type JournalLock = (task: () => boolean) => Promise<boolean>
export type JournalSnapshot = { journal: Journal; error: string; blocked: boolean; draft: Journal | null; remoteChanges: number }
export const JOURNAL_LOCK = 'dram.journal.write.v2'
const readError = 'Nie udało się odczytać dziennika. Dotychczasowy zapis nie zostanie nadpisany.'
const conflictError = 'Dziennik zmienił się w innej karcie. Ta operacja nie została zapisana. Pokazujemy aktualne dane. Możesz pobrać kopię niezapisanych zmian i ponowić operację.'

export class JournalDraftConflict extends Error {
  draft: Journal
  constructor(message: string, draft: Journal) { super(message); this.draft = draft }
}

/** localStorage remains the journal format. Web Locks serialize check-and-write across tabs. */
export function createJournalStore(storage: StoragePort, lock: JournalLock | null, catalogIds: string[]) {
  let baseline: string | null = null, generation = 0, queue = Promise.resolve(true)
  let snapshot: JournalSnapshot = { journal: emptyJournal(), error: '', blocked: false, draft: null, remoteChanges: 0 }
  const listeners = new Set<() => void>()
  const emit = (patch: Partial<JournalSnapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()) }
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
    } catch { emit({error:readError,blocked:true}) }
  }
  function update(recipe: (journal: Journal) => Journal, options?: { replacement?: boolean; expectedRaw?: string | null }) {
    const requestedGeneration = generation
    const operation = async (): Promise<boolean> => {
      if (!lock) { emit({error:'Ta przeglądarka nie obsługuje bezpiecznego zapisu między kartami. Pobierz kopię i otwórz aplikację w aktualnej przeglądarce przez HTTPS.'}); return false }
      try {
        return await lock(() => {
          if (snapshot.blocked && !options?.replacement) return false
          let candidate: Journal
          try { candidate = validateJournal(recipe(snapshot.journal), catalogIds) }
          catch (error) {
            let draft: Journal | null = null
            if (error instanceof JournalDraftConflict) { try {draft=validateJournal(error.draft,catalogIds)} catch {/* The open form still holds invalid or removed-record content. */} }
            emit({error:error instanceof Error ? error.message : 'Nie udało się zapisać zmian.',draft}); return false
          }
          const raw = diskRaw()
          if (raw !== baseline || requestedGeneration !== generation || (options && 'expectedRaw' in options && raw !== options.expectedRaw)) {
            baseline = raw; generation++
            try { emit({journal:decode(raw),blocked:false,error:conflictError,draft:candidate,remoteChanges:snapshot.remoteChanges+1}) }
            catch { emit({error:readError,blocked:true,draft:candidate}) }
            return false
          }
          // No await between the comparison and write. The cross-tab lock remains held.
          const next = JSON.stringify(candidate)
          try { storage.setItem(STORAGE_KEY,next) }
          catch { emit({error:'Nie udało się zapisać zmian. Sprawdź wolne miejsce i spróbuj ponownie.',draft:candidate}); return false }
          baseline = next
          emit({journal:candidate,error:'',blocked:false,draft:null})
          return true
        })
      } catch { emit({error:'Nie udało się uzyskać dostępu do zapisu. Dotychczasowe dane pozostały bez zmian.'}); return false }
    }
    queue = queue.then(operation,operation)
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
        if (legacy !== null) emit({error:'Starsza wersja aplikacji zmieniła poprzedni zapis dziennika. Aktualne dane są bezpieczne. Pobierz kopię tych zmian, a następnie porównaj ją lub przywróć przez import.',draft:decode(legacy)})
      } catch {emit({error:'Starsza karta zmieniła poprzedni zapis. Aktualny dziennik pozostał bez zmian.'})}
    },
    reload,
    update,
    replace: (journal: Journal, expectedRaw: string | null) => update(() => journal,{replacement:true,expectedRaw}),
    initialize: async () => {
      if (snapshot.blocked || !lock) return false
      try {return await lock(() => {
        reload()
        if (snapshot.blocked) return false
        if (storage.getItem(STORAGE_KEY) !== null && baseline !== null && JSON.parse(baseline).version === 2) return true
        const next = JSON.stringify(snapshot.journal)
        storage.setItem(STORAGE_KEY,next);baseline=next;emit({error:''});return true
      })} catch {emit({error:'Nie udało się zapisać zmian. Sprawdź wolne miejsce i spróbuj ponownie.'});return false}
    },
    clearError: () => { if (!snapshot.blocked) emit({error:'',draft:null}) },
  }
}
