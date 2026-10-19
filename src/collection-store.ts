import {createJournalStore} from './journal-store.ts'
import type {JournalCodec,JournalLock} from './journal-store.ts'
import {COLLECTION_KEY,COLLECTION_PENDING,emptyCollection,validateCollection} from './collection-model.ts'
import type {CollectionJournal} from './collection-model.ts'
import {STORAGE_KEY,LEGACY_STORAGE_KEY} from './model.ts'
import type {Journal} from './model.ts'
import {adaptLegacyRecipe,mutation} from './collection.ts'
export const collectionCodec:JournalCodec<CollectionJournal>={key:COLLECTION_KEY,legacyKeys:[STORAGE_KEY,LEGACY_STORAGE_KEY],pendingPrefix:COLLECTION_PENDING,version:3,empty:emptyCollection,validate:validateCollection}
export function createCollectionStore(storage:Parameters<typeof createJournalStore>[0],lock:JournalLock|null,catalogIds:string[]){
 const base=createJournalStore(storage,lock,catalogIds,collectionCodec)
 let initialized=false,initialization:Promise<boolean>|null=null
 const unavailable=()=>{base.reportFailure('Kolekcja jest przygotowywana. Spróbuj ponownie za chwilę.');return Promise.resolve(false)}
 return {...base,
  update:(recipe:(j:Journal)=>Journal,options?:{replacement?:boolean;expectedRaw?:string|null})=>initialized?base.update(adaptLegacyRecipe(recipe,mutation()),options):unavailable(),
  updateCollection:(recipe:(j:CollectionJournal)=>CollectionJournal,options?:{expectedRaw?:string|null})=>initialized?base.update(recipe,options):unavailable(),
  initialize:()=>{
   if(initialization)return initialization
   initialization=(async()=>{
    let legacyError='',legacyDraft:CollectionJournal|null=null
    // Recover the preceding app's durable intents before taking the migration snapshot.
    if(storage.getItem(COLLECTION_KEY)===null){
     const old=createJournalStore(storage,lock,catalogIds)
     await old.initialize()
     const previous=old.getSnapshot();legacyError=previous.error
     if(previous.draft)legacyDraft=validateCollection(previous.draft,catalogIds)
    }
    const success=await base.initialize();initialized=true
    if(legacyError)base.reportFailure(legacyError,legacyDraft)
    return success
   })().catch(()=>{initialized=true;base.reportFailure('Nie udało się przygotować kolekcji. Starsze dane pozostały zachowane.');return false})
   return initialization
  },
 }
}
