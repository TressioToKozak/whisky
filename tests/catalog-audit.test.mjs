import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {barcodeMatches} from '../src/barcode.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const catalog=read('../src/catalog.json'),audit=read('../data/catalog-audit-2026-10-19.json'),prices=read('../src/prices.json'),entries=read('../src/barcodes.json')
test('the audit accounts for every photo, price and preserved historical catalog ID',()=>{
 assert.deepEqual(audit.productsReviewed.map(x=>x.id),catalog.map(x=>x.id))
 assert.equal(audit.originalPhotosUnchanged,541);assert.equal(audit.oldIdsPreserved,true)
 for(const w of catalog){const row=audit.productsReviewed.find(x=>x.id===w.id);assert.equal(row.volumeMl,w.volume);assert.equal(row.photo.visuallyReviewed,true);assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+w.image,import.meta.url))).digest('hex'),row.photo.sourceSha256);if(!prices[w.id].referenceOnly&&prices[w.id].kind!=='user-report')assert.equal(prices[w.id].volumeMl,w.volume);if(prices[w.id].referenceOnly)assert.match(prices[w.id].note,/Nie uwzględniamy jej/);assert.ok(['retail-source-confirmed','all-auction-results-and-median-confirmed','user-report-not-independently-verified'].includes(row.price.status))}
 assert.equal(audit.productsReviewed.filter(x=>x.price.status==='user-report-not-independently-verified').length,2)
})
test('Jameson Original is the 700 ml bottle and has its published bottle GTIN',()=>{
 const w=catalog.find(w=>w.brand==='Jameson'&&w.name==='Original');assert.ok(w);assert.equal(w.volume,700);assert.equal(w.abv,40);assert.equal(prices[w.id].originalAmount,19.95)
 assert.deepEqual(barcodeMatches('5011007003005',catalog,entries).map(w=>w.id),[w.id])
 for(const name of ['Cold Brew','Orange Spirit']){const drink=catalog.find(w=>w.brand==='Jameson'&&w.name===name);assert.equal(drink.abv,30);assert.match(drink.description,/Napój spirytusowy/)}
})
test('independent Bushmills 22 prices the full 700 ml bottle instead of its sample offer',()=>{
 const w=catalog.find(w=>w.brand==='Bushmills'&&w.name.includes('22 Year Old'));assert.equal(w.volume,700);assert.equal(prices[w.id].originalAmount,249.95);assert.equal(prices[w.id].originalCurrency,'GBP');assert.match(prices[w.id].sourceUrl,/sku=143252/)
})
test('a real shared McLaren GTIN keeps both documented labels as choices',()=>{
 const matches=barcodeMatches('5099873026045',catalog,entries);assert.ok(matches.some(w=>w.name==='X Mclaren Limited Edition 2023'));assert.ok(matches.some(w=>w.name==='McLaren X JD Edition 2024'));assert.equal(matches.length,2)
})
