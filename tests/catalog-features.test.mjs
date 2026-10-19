import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {WHISKY_TYPES} from '../src/model.ts'
import {ageStatus,typeOf} from '../src/classification.ts'
import {brandOf,brands} from '../src/brands.ts'
import {catalogStats,statsBlock} from '../scripts/catalog-stats.mjs'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const catalog=read('../src/catalog.json'),report=read('../data/popular-expansion-2026-10-19.json'),prior=read('../data/catalog-audit-2026-10-19.json'),other=read('../data/other-category-audit-2026-10-19.json'),codes=read('../src/barcodes.json')
test('all baseline IDs, low-ABV drinks and photographed editions survive; forty requests are accounted for',()=>{
 const baseline=[...prior.productsReviewed.map(w=>w.id),...other.products.map(w=>w.id)];assert.equal(baseline.length,598);assert.ok(baseline.every(id=>catalog.some(w=>w.id===id)));assert.equal(report.added.length,40);assert.deepEqual(report.added.map(w=>w.requestedNumber),Array.from({length:40},(_,i)=>i+1));assert.equal(report.notAdded.length,0)
 assert.equal(catalog.length,638);for(const id of report.flavouredAndLowAbvBaselineIds)assert.ok(catalog.find(w=>w.id===id)?.abv<40)
})
test('age status is explicit and independent of edition category and whisky type',()=>{
 for(const w of catalog){assert.ok(WHISKY_TYPES.includes(w.whiskyType),w.id);assert.ok(['nas','stated','unknown'].includes(w.ageStatus));assert.equal(w.age!==null,w.ageStatus==='stated');assert.ok(['Klasyka','Edycja specjalna','Kolekcjonerska'].includes(w.category))}
 assert.equal(ageStatus({age:null}),'unknown');assert.equal(ageStatus({age:null,ageStatus:'nas'}),'nas');assert.equal(typeOf({}),'unknown')
 const green=catalog.find(w=>w.name==='Green Spot');assert.equal(green.age,null);assert.notEqual(green.age,8)
})
test('Maker’s Mark and Suntory corrections keep original IDs and Toki line',()=>{
 const makers=catalog.filter(w=>w.brand==='Maker’s Mark');assert.ok(makers.some(w=>w.name==='Original'));assert.ok(makers.some(w=>w.name==='46'));assert.ok(!catalog.some(w=>w.brand==='Makers Mark'))
 assert.equal(catalog.find(w=>w.id==='toki-f4832cf8c916').series,'Toki');assert.equal(catalog.find(w=>w.id==='toki-769a58a24728').series,'Toki');assert.equal(brandOf({brand:'Toki'}),'suntory');assert.equal(brandOf({brand:'Suntory'}),'suntory');assert.equal(brands.find(b=>b.id==='suntory').name,'Suntory');assert.equal(catalog.filter(w=>brandOf(w)==='suntory').length,5)
})
test('specific source errors are not copied into age, country, type, strength or barcode data',()=>{
 const peach=catalog.find(w=>w.id==='jim-beam-2f7ba13aa2c2');assert.equal(peach.country,'Nieustalone');assert.equal(peach.salesMarket,undefined)
 for(const [brand,abv]of [['Talisker',45.8],['Bunnahabhain',46.3]])assert.equal(catalog.find(w=>w.brand===brand).abv,abv)
 for(const brand of ['Aberlour','Maker’s Mark','Elijah Craig']){const w=report.added.find(w=>w.brand===brand);assert.equal(w.barcode,null);assert.ok(!codes.some(e=>e.whiskyId===w.id))}
 for(const row of report.added){assert.ok(row.photoVisuallyReviewed);const w=catalog.find(w=>w.id===row.id);assert.equal(w.image,w.imageSource);assert.ok(w.image.startsWith('https://'))}
 assert.equal(catalog.find(w=>w.brand==="Jack Daniel's"&&w.name.includes('1954 Gold Medal')).whiskyType,'tennessee')
})
test('README statistics are generated from the current data',()=>{
 const stats=catalogStats();assert.equal(stats.products,catalog.length);assert.equal(stats.uniqueBarcodes,241);assert.equal(stats.barcodedEditions,244);assert.equal(stats.unquoted,6);assert.ok(readFileSync(new URL('../README.md',import.meta.url),'utf8').includes(statsBlock()))
})
