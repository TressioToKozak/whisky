import { useEffect, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import type { CollectionJournal } from '../collection-model'
import {validateCollection} from '../collection-model'
import { today } from '../model'
import { t } from '../i18n'
import { Modal } from './Primitives'

export function downloadJournal(journal: CollectionJournal | string, name = 'kopia') {
  const url = URL.createObjectURL(new Blob([typeof journal === 'string' ? journal : JSON.stringify(journal,null,2)],{type:'application/json'}))
  const link = document.createElement('a'); link.href = url; link.download = `dram-${name}-${today()}.json`; link.click()
  setTimeout(() => URL.revokeObjectURL(url),1000)
}
export default function BackupControls({ journal, catalogIds, getToken, onImport, onExport }: {journal:CollectionJournal;catalogIds:string[];getToken:()=>string|null;onImport:(journal:CollectionJournal,token:string|null)=>Promise<boolean>;onExport:()=>void}) {
  const [pending,setPending] = useState<{data:CollectionJournal;token:string|null}|null>(null)
  const [error,setError] = useState(''),[busy,setBusy]=useState(false)
  const task = useRef(0), confirming=useRef(false)
  useEffect(() => () => {task.current++},[])
  async function read(file:File) {
    const current = ++task.current; setError('');setBusy(true)
    const token = getToken()
    try {
      if (file.size > 20_000_000) throw Error('Plik kopii może mieć maksymalnie 20 MB.')
      const data = validateCollection(JSON.parse(await file.text()),catalogIds)
      if(current===task.current)setPending({data,token})
    } catch (e) { if(current===task.current)setError(e instanceof SyntaxError ? 'Plik nie jest poprawnym JSON. Dotychczasowe dane pozostały bez zmian.' : e instanceof Error ? e.message : 'Nie udało się odczytać pliku.') }
    finally {if(current===task.current)setBusy(false)}
  }
  return <section className="backup-controls" aria-label={t('Kopie dziennika')}><h3>{t('Kopie dziennika')}</h3><button className="button outline full" onClick={onExport}><Download size={18}/>{t('Eksportuj dane')}</button><label className="button outline full backup-upload"><Upload size={18}/>{busy ? t('Odczytuję plik…') : t('Importuj dane')}<input type="file" accept="application/json,.json" aria-label={t('Importuj dane')} disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void read(file)}}/></label>{error && !pending && <p role="alert" className="form-error">{t(error)}</p>}
    {pending && <Modal title={t('Zastąpić obecny dziennik?')} onClose={()=>{if(!busy)setPending(null)}} className="confirm-modal"><h2>{t('Zastąpić obecny dziennik?')}</h2><p>{t('Import zastąpi cały dziennik. Zanim potwierdzisz, możesz pobrać kopię obecnych danych.')}</p><p>{t('Whisky w barku')}: {pending.data.bottles.length} · {t('Degustacje')}: {pending.data.reviews.length} · {t('Własne wpisy')}: {pending.data.custom.length}</p><button className="button outline full" onClick={()=>downloadJournal(journal)}><Download size={17}/>{t('Pobierz kopię obecnych danych')}</button>{error && <p role="alert" className="form-error">{t(error)}</p>}<div className="confirm-actions"><button className="button outline" disabled={busy} onClick={()=>setPending(null)}>{t('Anuluj')}</button><button className="button dark" disabled={busy} onClick={async()=>{if(confirming.current)return;confirming.current=true;setBusy(true);const success=await onImport(pending.data,pending.token);setBusy(false);confirming.current=false;if(success)setPending(null);else setError('Import nie został zapisany. Sprawdź komunikat o zapisie i wybierz plik ponownie.')}}>{t('Przywróć dane')}</button></div></Modal>}
  </section>
}
