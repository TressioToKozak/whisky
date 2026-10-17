import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {comparePrices,marketLabel} from '../src/pricing.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const prices=read('../src/prices.json'),catalog=read('../src/catalog.json'),evidence=read('../data/price-evidence.json')
test('all catalog prices have evidence and honest market attribution',()=>{
 for(const w of catalog){const p=prices[w.id];assert.ok(p,w.name);assert.ok(p.amount>0);assert.equal(p.currency,'EUR');assert.ok(evidence[w.id]);assert.match(p.sourceUrl,/^https:\/\//);if(p.originalCurrency!=='EUR'){assert.ok(p.exchangeRate>0);assert.ok(p.exchangeRateSource)}}
 const s=prices['jw-black-sabrina-carpenter'];assert.equal(s.amount,25);assert.equal(s.kind,'user-report');assert.match(marketLabel(s),/zgłoszona/)
})
test('price sort starts cheap and keeps unpriced personal entries last in both directions',()=>{
 const sorted=[...catalog].sort((a,b)=>comparePrices(prices[a.id],prices[b.id]));assert.ok(prices[sorted[0].id].amount<15);assert.ok(!sorted[1].name.startsWith('Blue Label'))
 assert.ok(comparePrices(undefined,sorted[0])>0);assert.ok(comparePrices(undefined,sorted[0],true)>0)
})
test('requested omissions are present with local original photographs',()=>{
 for(const term of ['Sabrina Carpenter','A Song of Ice','A Song of Fire']){const w=catalog.find(w=>w.name.includes(term));assert.ok(w,term);assert.match(w.image,/^\/bottles\//);assert.match(w.imageSource,/^https:\/\//)}
})
