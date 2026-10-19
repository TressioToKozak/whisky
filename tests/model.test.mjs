import test from 'node:test'
import {brandOf} from '../src/brands.ts'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { matchesWhisky, average, emptyJournal, safeUrl, validateJournal } from '../src/model.ts'
const catalog=JSON.parse(readFileSync(new URL('../src/catalog.json',import.meta.url),'utf8'))
const ids=catalog.map(w=>w.id)
const review={id:'review-1',whiskyId:ids[0],score:8.5,note:'Miód, długi finisz',date:'2026-01-12',tags:['Miód']}
test('round-trip backup retains cellar, wishes and tasting notes',()=>{
 const data={...emptyJournal(),reviews:[review],bottles:[{whiskyId:ids[0],quantity:2,openedCount:1}],wishlist:[ids[1]]}
 assert.deepEqual(validateJournal(JSON.parse(JSON.stringify(data)),ids),data)
})
test('invalid, duplicate and foreign records cannot replace a journal',()=>{
 for(const patch of [{version:99},{reviews:[{...review,score:11}]},{reviews:[{...review,score:4.3}]},{reviews:[review,review]},{reviews:[{...review,date:'2026-02-30'}]},{reviews:[{...review,whiskyId:'nonexistent'}]},{bottles:[{whiskyId:ids[0],quantity:0,openedCount:0}]},{wishlist:['unknown']},{wishlist:[ids[0],ids[0]]}]) assert.throws(()=>validateJournal({...emptyJournal(),...patch},ids))
})
test('uploaded photos can be backed up; executable images and links are rejected',()=>{
 const custom={...catalog[0],id:'custom-test',image:'data:image/jpeg;base64,YWJj',custom:true}
 assert.equal(validateJournal({...emptyJournal(),custom:[custom]},ids).custom[0].image,custom.image)
 for(const image of ['javascript:alert(1)','data:image/svg+xml;base64,YWJj','http://untrusted.example/a.jpg'])assert.throws(()=>validateJournal({...emptyJournal(),custom:[{...custom,image}]},ids))
 assert.equal(safeUrl('https://example.com/bottle.jpg'),true)
 assert.equal(safeUrl('javascript:alert(1)'),false)
})
test('ratings are calculated from real user entries and start empty',()=>{
 assert.equal(average([]),null);assert.equal(average([review,{...review,id:'r2',score:7.5}]),8)
})
test('catalog IDs and names are unique and photographed files exist',()=>{
 assert.equal(new Set(ids).size,catalog.length)
 assert.equal(new Set(catalog.map(w=>w.brand+w.name)).size,catalog.length)
 for(const w of catalog){assert.ok(brandOf(w),w.brand);if(w.image){if(!w.image.startsWith('https://'))assert.ok(existsSync(new URL('../public'+w.image,import.meta.url)));assert.match(w.imageSource,/^https:\/\//)}}
})
test('catalog exceeds 82 editions, with an original, unique and checksum-verified photo for every entry',async()=>{
 const {createHash}=await import('node:crypto')
 const sources=JSON.parse(readFileSync(new URL('../data/catalog-sources.json',import.meta.url),'utf8'))
 assert.ok(catalog.length>82)
 assert.equal(sources.length,catalog.length)
 assert.equal(new Set(sources.map(s=>s.sha256)).size,sources.length)
 for(const w of catalog){
  assert.ok(w.image,'Missing photograph: '+w.name)
  const record=sources.find(s=>s.id===w.id);assert.ok(record)
  if(record.delivery==='original-source-link'){const audit=JSON.parse(readFileSync(new URL('../data/popular-expansion-2026-10-19.json',import.meta.url),'utf8'));assert.equal(audit.added.find(row=>row.id===w.id)?.photoSha256,record.sha256);assert.equal(w.image,w.imageSource)}else assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+w.image,import.meta.url))).digest('hex'),record.sha256)
  assert.equal(record.sourcePage,w.source)
  assert.ok(record.width>=100&&record.height>=100)
 }
})

test('global search ignores apostrophes, accents and word order while matching all requested terms',()=>{
 const w={...catalog[0],brand:'Ballantine’s',name:'Sweet Blend',series:'Ballantine’s',aliases:['Słodki blend']}
 assert.equal(matchesWhisky(w,'ballantines sweet'),true)
 assert.equal(matchesWhisky(w,'blend ballantine'),true)
 assert.equal(matchesWhisky(w,'slodki'),true)
 assert.equal(matchesWhisky(w,'sweet bourbon'),false)
})

test('search accepts joined whisky names and brand words in either order',async()=>{
 const {matchesWhisky}=await import('../src/model.ts')
 const whisky={brand:'Johnnie Walker',name:'Red Label',series:'Klasyka',tags:[]}
 for(const query of ['Red Label','RedLabel','red label','Johnnie Walker Red Label','johnniewalker redlabel','redlabel johnniewalker'])assert.ok(matchesWhisky(whisky,query),query)
 assert.equal(matchesWhisky(whisky,'blue label'),false)
 const polish={...whisky,brand:'Ballantine’s',name:'Łagodna próba'}
 assert.ok(matchesWhisky(polish,"ballantine's lagodnaproba"))
})
