import {sha256}from'@noble/hashes/sha2.js'
import {bytesToHex,utf8ToBytes}from'@noble/hashes/utils.js'
import {blankBottle,validateCollection}from'./collection-model.ts'
import type {CollectionJournal,OwnedBottle}from'./collection-model.ts'
import type {Whisky}from'./model.ts'
import {locationPath}from'./collection.ts'
export const columns=['id','whisky_id','name','brand','status','purchase_date','amount','currency','place','location','notes'] as const
export type Column=typeof columns[number]
export type Mapping=Partial<Record<Column,number>>
export const labels:Record<Column,string>={id:'ID egzemplarza',whisky_id:'ID whisky',name:'Nazwa whisky',brand:'Marka',status:'Status',purchase_date:'Data zakupu',amount:'Cena zakupu',currency:'Waluta zakupu',place:'Miejsce zakupu',location:'Lokalizacja',notes:'Notatki'}
export function parseCSV(text:string):string[][]{
 if(text.length>5_000_000)throw Error('CSV może mieć maksymalnie 5 MB.')
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0],delimiter=(first.match(/;/g)?.length??0)>(first.match(/,/g)?.length??0)?';':','
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false,closed=false
 for(let i=0;i<text.length;i++){
  const c=text[i]
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=c;continue}
  if(c==='"'){if(value||closed)throw Error('Nieprawidłowy cudzysłów w CSV.');quoted=true}
  else if(c===delimiter){row.push(value);value='';closed=false}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value='';closed=false;if(rows.length>20001)throw Error('CSV może mieć maksymalnie 20 000 wierszy.')}
  else {if(closed&&c.trim())throw Error('Nieprawidłowy tekst po cudzysłowie w CSV.');if(!closed)value+=c}
 }
 if(quoted)throw Error('Niezamknięty cudzysłów w CSV.');row.push(value);if(row.some(x=>x.trim()))rows.push(row)
 if(rows.length<2)throw Error('CSV musi zawierać nagłówek i co najmniej jeden wiersz.')
 if(rows.some(r=>r.length!==rows[0].length))throw Error('Wiersze CSV mają różną liczbę kolumn.')
 return rows
}
export function guessMapping(headers:string[]):Mapping{const map:Mapping={};for(const field of columns){const index=headers.findIndex(h=>h.trim().toLowerCase()===field||h.trim().toLowerCase()===labels[field].toLowerCase());if(index>=0)map[field]=index}return map}
const digest=(text:string)=>bytesToHex(sha256(utf8ToBytes(text))).slice(0,24)
export function previewCSV(rows:string[][],mapping:Mapping,current:CollectionJournal,catalog:Whisky[],mode:'merge'|'replace'){
 if(mapping.whisky_id===undefined&&mapping.name===undefined)throw Error('Wybierz kolumnę ID whisky lub Nazwa whisky.')
 const selected=Object.values(mapping);if(new Set(selected).size!==selected.length)throw Error('Każda kolumna może być przypisana tylko raz.')
 const errors:string[]=[],incoming:OwnedBottle[]=[],seen=new Set(mode==='merge'?current.ownedBottles.map(b=>b.id):[]);let duplicates=0
 const locations=[...current.locations]
 for(let i=1;i<rows.length;i++){
  const row=rows[i],get=(key:Column)=>mapping[key]===undefined?'':(row[mapping[key]!]??'').trim()
  try{
   const id=get('whisky_id'),name=get('name'),brand=get('brand'),matches=catalog.filter(w=>id?w.id===id:w.name.toLocaleLowerCase()===name.toLocaleLowerCase()&&(!brand||w.brand.toLocaleLowerCase()===brand.toLocaleLowerCase()))
   if(matches.length!==1)throw Error('Nie znaleziono jednoznacznego wydania w katalogu.')
   const bottleId=get('id')||`csv:${digest(JSON.stringify(row))}`
   if(seen.has(bottleId)){duplicates++;continue}seen.add(bottleId)
   const b=blankBottle(bottleId,matches[0].id)
   const status=get('status')||'closed',aliases:Record<string,string>={zamknięta:'closed',otwarta:'open',pusta:'empty',sprzedana:'sold',podarowana:'gifted',wycofana:'archived'}
   b.status=(aliases[status.toLowerCase()]??status.toLowerCase()) as OwnedBottle['status'];if(b.status==='empty')b.remainingMl=0
   const amount=get('amount'),currency=get('currency').toUpperCase(),date=get('purchase_date'),place=get('place')
   b.purchase={kind:amount||date||place?'purchase':'unknown',date:date||null,amount:amount?Number(amount.replace(',','.')):null,currency:currency?currency as OwnedBottle['purchase']['currency']:null,place}
   b.notes=get('notes')
   const location=get('location');if(location){let found=locations.find(l=>locationPath(locations,l.id)===location);if(!found){found={id:`csv-location:${digest(location)}`,name:location,parentId:null,kind:'other'};locations.push(found)}b.locationId=found.id}
   // Run the same domain validation used by editors and JSON backup restoration.
   const validated=validateCollection({...current,ownedBottles:[b],events:[],locations},catalog.map(w=>w.id));incoming.push(validated.ownedBottles[0])
  }catch(e){errors.push(`${i+1}: ${e instanceof Error?e.message:'Niepoprawny wiersz.'}`)}
 }
 const data=validateCollection({...current,ownedBottles:mode==='merge'?[...current.ownedBottles,...incoming]:incoming,events:mode==='merge'?current.events:[],locations},catalog.map(w=>w.id))
 return {data,errors,duplicates,added:incoming.length}
}
export function tableRows(journal:CollectionJournal,catalog:Whisky[]):(string|number)[][]{
 const byId=new Map(catalog.map(w=>[w.id,w]))
 return [Array.from(columns),...journal.ownedBottles.map(b=>{const w=byId.get(b.whiskyId);return[b.id,b.whiskyId,w?.name??'',w?.brand??'',b.status,b.purchase.date??'',b.purchase.amount??'',b.purchase.currency??'',b.purchase.place,locationPath(journal.locations,b.locationId),b.notes]})]
}
export const safeCell=(v:string|number)=>typeof v==='number'?String(v):/^[\s\u0000-\u001f]*[=+@-]/.test(v)?`'${v}`:v
export function exportCSV(rows:(string|number)[][]){return '\uFEFF'+rows.map(row=>row.map(value=>`"${safeCell(value).replaceAll('"','""')}"`).join(',')).join('\r\n')}
const xml=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
const crc=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
/** Small standards-based OOXML writer. Inline strings cannot execute spreadsheet formulas. */
export function exportXLSX(rows:(string|number)[][]):Uint8Array{
 const files:Record<string,string>={
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dram" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row,i)=>`<row r="${i+1}">${row.map(value=>typeof value==='number'?`<c><v>${value}</v></c>`:`<c t="inlineStr"><is><t xml:space="preserve">${xml(safeCell(value))}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`
 }
 const chunks:Uint8Array[]=[],directory:Uint8Array[]=[];let offset=0,size=0
 for(const [name,text]of Object.entries(files)){
  const n=utf8ToBytes(name),body=utf8ToBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+text),checksum=crc(body)
  const header=new Uint8Array(30+n.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,checksum,true);v.setUint32(18,body.length,true);v.setUint32(22,body.length,true);v.setUint16(26,n.length,true);header.set(n,30)
  const central=new Uint8Array(46+n.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint32(16,checksum,true);c.setUint32(20,body.length,true);c.setUint32(24,body.length,true);c.setUint16(28,n.length,true);c.setUint32(42,offset,true);central.set(n,46)
  chunks.push(header,body);directory.push(central);offset+=header.length+body.length;size+=central.length
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,directory.length,true);e.setUint16(10,directory.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true)
 const all=new Uint8Array(offset+size+22);let at=0;for(const part of [...chunks,...directory,end]){all.set(part,at);at+=part.length}return all
}
