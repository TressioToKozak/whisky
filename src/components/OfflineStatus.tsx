import {useEffect,useRef,useState}from'react'
import {t}from'../i18n'
export default function OfflineStatus({pending,busy}:{pending:number;busy:boolean}){
 const [online,setOnline]=useState(navigator.onLine),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[updating,setUpdating]=useState(false)
 const safe=useRef(false);safe.current=pending===0&&!busy
 useEffect(()=>{
  const connected=()=>setOnline(navigator.onLine);window.addEventListener('online',connected);window.addEventListener('offline',connected)
  if(!('serviceWorker'in navigator)||!import.meta.env.PROD)return()=>{window.removeEventListener('online',connected);window.removeEventListener('offline',connected)}
  let mounted=true
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(registration=>{
   if(!mounted)return
   if(registration.waiting)setWaiting(registration.waiting)
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&mounted){setReady(true);if(navigator.serviceWorker.controller)setWaiting(worker)}})})
   void navigator.serviceWorker.ready.then(reg=>{if(mounted){setReady(true);const assets=Array.from(document.querySelectorAll<HTMLScriptElement|HTMLLinkElement>('script[type=module][src],link[rel=stylesheet][href]')).map(el=>new URL(el instanceof HTMLScriptElement?el.src:el.href).pathname);reg.active?.postMessage({type:'PRUNE_OLD_CACHES',assets})}})
   void registration.update().catch(()=>{/* Existing offline shell remains usable. */})
  }).catch(()=>{if(mounted)setError('Tryb offline nie jest gotowy. Sprawdź połączenie i wolne miejsce.')})
  return()=>{mounted=false;window.removeEventListener('online',connected);window.removeEventListener('offline',connected)}
 },[])
 async function update(){
  if(!waiting||!safe.current||updating)return;setUpdating(true)
  // Every open tab must be at a safe point. No unsolicited reload or worker activation.
  const channel='BroadcastChannel'in window?new BroadcastChannel('dram-update-safety'):null
  const id=crypto.randomUUID();let veto=false
  if(channel){channel.onmessage=e=>{if(e.data.id===id&&e.data.type==='BUSY')veto=true};channel.postMessage({type:'CHECK',id});await new Promise(resolve=>setTimeout(resolve,350));channel.close()}
  const clients=await navigator.serviceWorker.getRegistration()
  if(veto||!safe.current||!clients){setUpdating(false);setError('Zamknij edycję i poczekaj na zakończenie zapisu we wszystkich kartach.');return}
  // Activation is harmless to other tabs: previous immutable shells stay cached.
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(safe.current)location.reload();else{setUpdating(false);setError('Nowa wersja jest gotowa. Odśwież po zakończeniu edycji.')}},{once:true})
  waiting.postMessage('ACTIVATE_UPDATE')
 }
 useEffect(()=>{if(!('BroadcastChannel'in window))return;const c=new BroadcastChannel('dram-update-safety');c.onmessage=e=>{if(e.data.type==='CHECK'&&!safe.current)c.postMessage({type:'BUSY',id:e.data.id})};return()=>c.close()},[])
 if(online&&!waiting&&!error)return null
 return <aside className="offline-status" aria-label={t('Dostępność aplikacji')}><p role="status">{!online?t(ready?'Offline · kolekcja i katalog są dostępne. Zdjęcia ze sklepów mogą wymagać sieci.':'Brak połączenia.'):waiting?t('Dostępna jest nowa wersja aplikacji.'):''}</p>{error&&<p role="alert">{t(error)}</p>}{waiting&&<button className="button outline" disabled={pending>0||busy||updating||!online} onClick={()=>void update()}>{t('Zapisz pracę i zaktualizuj')}</button>}</aside>
}
