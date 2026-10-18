import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {comparePrices,marketLabel} from '../src/pricing.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const prices=read('../src/prices.json'),catalog=read('../src/catalog.json'),evidence=read('../data/price-evidence.json')
test('all catalog prices have evidence and honest market attribution',()=>{
 for(const w of catalog){const p=prices[w.id];assert.ok(p,w.name);assert.ok(p.amount>0);assert.equal(p.currency,'EUR');assert.ok(evidence[w.id]);assert.match(p.sourceUrl,/^https:\/\//);if(p.originalCurrency!=='EUR'){assert.ok(p.exchangeRate>0);assert.ok(p.exchangeRateSource)}}
 const s=prices['jw-black-sabrina-carpenter'];assert.equal(s.amount,25);assert.equal(s.kind,'user-report');assert.match(marketLabel(s),/zgłoszona/i)
})
test('price sort starts cheap and keeps unpriced personal entries last in both directions',()=>{
 const sorted=[...catalog].sort((a,b)=>comparePrices(prices[a.id],prices[b.id]));assert.ok(prices[sorted[0].id].amount<15);assert.ok(!sorted[1].name.startsWith('Blue Label'))
 assert.ok(comparePrices(undefined,sorted[0])>0);assert.ok(comparePrices(undefined,sorted[0],true)>0)
})
test('requested omissions are present with local original photographs',()=>{
 for(const term of ['Sabrina Carpenter','A Song of Ice','A Song of Fire']){const w=catalog.find(w=>w.name.includes(term));assert.ok(w,term);assert.match(w.image,/^\/bottles\//);assert.match(w.imageSource,/^https:\/\//)}
})

test('cellar value multiplies quantities, sums cents and reports unpriced bottles',async()=>{
 const {cellarValue}=await import('../src/pricing.ts')
 const quotes={a:{amount:19.95},b:{amount:25.5}}
 assert.deepEqual(cellarValue([{whiskyId:'a',quantity:3},{whiskyId:'b',quantity:2},{whiskyId:'custom',quantity:4}],quotes),{amount:110.85,missing:4})
 assert.deepEqual(cellarValue([],quotes),{amount:0,missing:0})
})

test('wishlist values one bottle per saved position and keeps missing prices explicit',async()=>{
 const {wishlistValue}=await import('../src/pricing.ts')
 assert.deepEqual(wishlistValue(['a','b','unpriced'],{a:{amount:19.95},b:{amount:25.5}}),{amount:45.45,missing:1})
 assert.deepEqual(wishlistValue([],{}),{amount:0,missing:0})
})

test('other-size or unconfirmed auction references stay visible but do not inflate collections',async()=>{
 const {cellarValue,wishlistValue,priceLabel}=await import('../src/pricing.ts')
 const quotes={a:{amount:30,volumeMl:700},otherSize:{amount:4000,volumeMl:750,referenceOnly:true},unknown:{amount:50,volumeMl:null,referenceOnly:true}}
 assert.deepEqual(cellarValue([{whiskyId:'a',quantity:2},{whiskyId:'otherSize',quantity:1},{whiskyId:'unknown',quantity:3}],quotes),{amount:60,missing:4})
 assert.deepEqual(wishlistValue(['a','otherSize'],quotes),{amount:30,missing:1})
 assert.match(priceLabel(quotes.otherSize),/^ref\..*750 ml$/)
})
