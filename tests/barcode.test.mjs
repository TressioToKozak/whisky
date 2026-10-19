import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {displayBarcode,normalizeBarcode,expandUpce,barcodeMatches,addBarcodeBottle} from '../src/barcode.ts'
import {emptyJournal,validateJournal} from '../src/model.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const all=read('../src/catalog.json'),entries=read('../src/barcodes.json'),audit=read('../data/barcode-audit.json')
const entry=entries.find(e=>all.find(w=>w.id===e.whiskyId)?.brand==='Glenfiddich'),w=all.find(w=>w.id===entry.whiskyId)
const ids=all.map(w=>w.id)
test('EAN/UPC check digits, leading zeros and GTIN canonical equivalence',()=>{
 assert.equal(normalizeBarcode('5010327324333'),'05010327324333')
 assert.equal(normalizeBarcode('5 010327 324333'),'05010327324333')
 assert.equal(normalizeBarcode('036000291452'),normalizeBarcode('0036000291452'))
 for(const bad of ['5010327324334','https://example.com','12345','0000000000000','1e12','03600029145x'])assert.equal(normalizeBarcode(bad),null,bad)
 assert.equal(expandUpce('04210007'),'042000001007')
 assert.equal(expandUpce('04210005'),null)
 assert.equal(normalizeBarcode('96385074'),'00000096385074')
})
test('every initial mapping is backed by published, valid source evidence at the same volume',()=>{
 assert.ok(entries.length>=100)
 for(const e of entries){
  assert.equal(normalizeBarcode(e.code),e.code)
  const whisky=all.find(w=>w.id===e.whiskyId);assert.ok(whisky)
  assert.equal(e.volumeMl,whisky.volume)
  const source=audit.observations.find(o=>o.id===e.whiskyId&&o.source===e.sourceUrl&&o.codes?.some(code=>normalizeBarcode(code)===e.code));assert.ok(source,e.whiskyId)
  assert.ok(source.sourceVolumeMl===null||source.sourceVolumeMl===e.volumeMl)
 }
})
test('matches retain ambiguity, reject wrong-volume records and allow explicit personal associations',()=>{
 assert.deepEqual(barcodeMatches(entry.code,all,entries).map(w=>w.id),[w.id])
 const other={...w,id:'other-volume',volume:w.volume+300}
 assert.equal(barcodeMatches(entry.code,[w,other],[entry,{...entry,whiskyId:other.id}]).length,1)
 assert.equal(barcodeMatches(entry.code,[w,other],[entry,{...entry,whiskyId:other.id,volumeMl:other.volume}]).length,2)
 assert.deepEqual(barcodeMatches(entry.code,[w,other],entries,[{code:entry.code,whiskyId:other.id}]).map(w=>w.id),[other.id])
 assert.deepEqual(barcodeMatches('1234567890128',all,entries),[])
})
test('confirmed scans increment quantities once, preserve opened status and reviews, remove wishes, and round-trip associations',()=>{
 const original={...emptyJournal(),wishlist:[w.id],reviews:[{id:'review',whiskyId:w.id,score:8,date:'2026-10-18',note:'keep',tags:[]}],bottles:[{whiskyId:w.id,quantity:2,openedCount:1}]}
 const next=addBarcodeBottle(original,w,entry.code,true)
 assert.equal(next.bottles[0].quantity,3);assert.equal(next.bottles[0].openedCount,1);assert.deepEqual(next.reviews,original.reviews);assert.equal(next.wishlist.length,0)
 assert.equal(original.bottles[0].quantity,2)
 assert.deepEqual(validateJournal(JSON.parse(JSON.stringify(next)),ids),next)
 assert.deepEqual(validateJournal(emptyJournal(),ids),emptyJournal())
 assert.equal(addBarcodeBottle(emptyJournal(),w,entry.code,false).barcodeLinks,undefined)
 assert.throws(()=>addBarcodeBottle({...original,bottles:[{whiskyId:w.id,quantity:999,openedCount:0}]},w,entry.code,true))
 assert.throws(()=>addBarcodeBottle(original,w,'bad',true))
 for(const links of [[{code:'bad',whiskyId:w.id}],[{code:entry.code,whiskyId:'unknown'}],[{code:entry.code,whiskyId:w.id},{code:entry.code,whiskyId:w.id}]])assert.throws(()=>validateJournal({...original,barcodeLinks:links},ids))
})

test('verified Red Label EAN resolves exactly to the 700 ml catalog entry',()=>{
 const red=all.find(w=>w.id==='jw-004')
 assert.equal(red.name,'Red Label');assert.equal(red.volume,700)
 assert.equal(normalizeBarcode('5000267014203'),'05000267014203')
 assert.deepEqual(barcodeMatches('5000267014203',all,entries).map(w=>w.id),['jw-004'])
 let journal=addBarcodeBottle(emptyJournal(),red,'5000267014203',false)
 journal=addBarcodeBottle(journal,red,'5000267014203',false)
 assert.deepEqual(journal.bottles,[{whiskyId:'jw-004',quantity:2,openedCount:0}])
})

test('coverage report accounts for every catalog ID without claiming unknown codes',()=>{
 const coverage=read('../data/barcode-coverage.json')
 assert.equal(coverage.totalProducts,all.length)
 assert.deepEqual(coverage.products.map(w=>w.id),all.map(w=>w.id))
 assert.equal(coverage.coveredProducts,new Set(entries.map(e=>e.whiskyId)).size)
 assert.equal(coverage.uniqueCodes,new Set(entries.map(e=>e.code)).size)
 assert.ok(!entries.some(e=>e.code==='02000250820104'),'restricted-circulation retailer code must not be presented as a global Honey bottle code')
 for(const row of coverage.products)assert.deepEqual(row.codes,entries.filter(e=>e.whiskyId===row.id).map(e=>e.code))
})

test('readable barcode formatting preserves supermarket EAN-8 and UPC significant zeros',()=>{
 for(const code of ['20005009','20005016','20062606','085246342978','5000267014203']){const display=displayBarcode(normalizeBarcode(code));assert.equal(display,code);assert.equal(normalizeBarcode(display),normalizeBarcode(code))}
})
