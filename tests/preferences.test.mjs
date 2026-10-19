import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parsePreferences, PREFERENCES_KEY } from '../src/preferences.ts'
import { regionalPrices, cellarValue, wishlistValue, comparePrices } from '../src/pricing.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const quotes=read('../src/prices.json'),catalog=read('../src/catalog.json'),fx=read('../src/exchange-rate-pln.json'),audit=read('../data/other-category-audit-2026-10-19.json'),sources=read('../data/catalog-sources.json'),entries=read('../src/barcodes.json')
test('preferences validate independently and never share the journal storage key',()=>{
 assert.deepEqual(parsePreferences('{"language":"en","region":"NL","theme":"light"}'),{language:'en',region:'NL',theme:'light'})
 assert.equal(PREFERENCES_KEY,'dram.preferences.v1')
 assert.deepEqual(parsePreferences(null),{language:'pl',region:'NL',theme:'dark'})
 assert.deepEqual(parsePreferences('{broken'),{language:'pl',region:'NL',theme:'dark'})
 assert.deepEqual(parsePreferences('{"language":"en","region":"PL"}'),{language:'en',region:'PL',theme:'dark'})
 assert.deepEqual(parsePreferences('{"language":"unknown","region":"PL"}'),{language:'pl',region:'PL',theme:'dark'})
})
test('PL prices convert with documented rate without changing market attribution or source quotes',()=>{
 const pl=regionalPrices(quotes,'PL'),nl=regionalPrices(quotes,'NL'),q=quotes['jw-001']
 assert.equal(nl,quotes);assert.equal(pl['jw-001'].amount,Math.round(q.amount*fx.PLNperEUR*100)/100)
 assert.equal(pl['jw-001'].currency,'PLN');assert.equal(pl['jw-001'].market,q.market);assert.equal(pl['jw-001'].sourceUrl,q.sourceUrl)
 assert.equal(pl['jw-001'].conversionDate,fx.date);assert.equal(pl['jw-001'].convertedFromEUR,q.amount);assert.equal(q.currency,'EUR');assert.equal(q.conversionDate,undefined)
 const ids=['jw-001','jw-004'];assert.equal(wishlistValue(ids,pl).amount,Math.round((pl[ids[0]].amount+pl[ids[1]].amount)*100)/100)
 assert.equal(cellarValue([{whiskyId:ids[0],quantity:3}],pl).amount,Math.round(pl[ids[0]].amount*300)/100)
 assert.ok(comparePrices(undefined,pl['jw-001'],true)>0)
 const reference=Object.entries(pl).find(([,q])=>q.referenceOnly);assert.deepEqual(wishlistValue([reference[0]],pl),{amount:0,missing:1})
})
test('Other includes authentic supermarket bottles with exact-capacity codes and explicit missing prices',()=>{
 assert.equal(audit.products.length,19)
 for(const row of audit.products){const w=catalog.find(w=>w.id===row.id);assert.ok(w);assert.equal(w.volume,row.volumeMl);assert.equal(w.abv,row.abv);assert.ok(entries.some(e=>e.whiskyId===row.id&&e.code===row.barcode&&e.volumeMl===w.volume));assert.equal(sources.find(s=>s.id===w.id).sha256,row.photoSha256);assert.ok(w.image.startsWith('/bottles/'));assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+w.image,import.meta.url))).digest('hex'),row.photoSha256);if(row.priceStatus==='unverified-price-not-in-valuation'){assert.equal(quotes[w.id],undefined);assert.deepEqual(wishlistValue([w.id],quotes),{amount:0,missing:1})}else assert.ok(quotes[w.id].amount>0)}
 for(const brand of ['Golden Loch','Queen Margot','Western Gold','Dundalgan',"Grant's","Bell's",'Tullamore D.E.W.'])assert.ok(audit.products.some(row=>catalog.find(w=>w.id===row.id)?.brand===brand),brand)
})
