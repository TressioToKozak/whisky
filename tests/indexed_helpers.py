"""Read the real IndexedDB stores in E2E; localStorage is deliberately not a mirror."""
READ_SCRIPT=r'''window.readDramJournal=async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('dram-collection',1);r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result)};r.onerror=()=>reject(r.error)});
 try{return await new Promise((resolve,reject)=>{
 const names=['metadata','ownedBottles','events','locations','attachments'],tx=db.transaction(names),rows={};let left=names.length;
 for(const name of names){const r=tx.objectStore(name).getAll();r.onsuccess=()=>{rows[name]=r.result;if(--left)return;const meta=rows.metadata.find(m=>m.id==='journal');if(!meta){resolve(null);return}
 const j={...meta.journal,ownedBottles:rows.ownedBottles,events:rows.events,locations:rows.locations};
 for(const field of ['ownedBottles','events','locations'])if(meta.order?.[field]){const rank=new Map(meta.order[field].map((id,i)=>[id,i]));j[field].sort((a,b)=>rank.get(a.id)-rank.get(b.id))}
 const files=new Map(rows.attachments.map(f=>[f.id,f]));
 for(const b of j.ownedBottles)b.attachments=b.attachments.map(f=>{const binary=files.get(f.storageId);let s='';for(let i=0;i<binary.bytes.length;i+=16384)s+=String.fromCharCode(...binary.bytes.subarray(i,i+16384));const {storageId,...metadata}=f;return{...metadata,data:'data:'+binary.mime+';base64,'+btoa(s)}});
 const counts=new Map();for(const b of j.ownedBottles)if(['closed','open'].includes(b.status)){const stock=counts.get(b.whiskyId)||{whiskyId:b.whiskyId,quantity:0,openedCount:0};stock.quantity++;stock.openedCount+=b.status==='open'?1:0;counts.set(b.whiskyId,stock)}j.bottles=[...counts.values()];resolve(j)
 }}tx.onabort=()=>reject(tx.error)
 })}finally{db.close()}
};window.seedDramJournal=async journal=>{await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('dram-collection');r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>{}});localStorage.setItem('dram.journal.v3',JSON.stringify(journal));};'''
DELETE_SCRIPT="await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('dram-collection');r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>{}});"
def install_indexed_helpers(context):context.add_init_script(READ_SCRIPT)
def open_discovery(page):
    nav=page.locator('.sidebar'if page.evaluate('innerWidth')>=1024 else'.bottom-nav')
    nav.locator('[data-tab="discover"]').click()
