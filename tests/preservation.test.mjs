import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import{createHash}from'node:crypto'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8')),hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex')
test('all 598 existing IDs, edition categories, photos, prices and barcode records are preserved',()=>{
 const baseline=read('../data/preservation-baseline-2026-10-19.json'),catalog=read('../src/catalog.json'),prices=read('../src/prices.json'),sources=read('../data/catalog-sources.json'),codes=read('../src/barcodes.json')
 const tasting=read('../data/tasting-audit-2026-10-19.json').products
 assert.equal(baseline.products.length,598)
 for(const row of baseline.products){const w=catalog.find(w=>w.id===row.id);assert.ok(w,row.id);for(const tag of tasting.find(t=>t.id===w.id)?.previousTags ?? [])assert.ok(w.tags.includes(tag));assert.equal(hash(Object.fromEntries(baseline.immutableFields.map(k=>[k,k==='tags' ? (tasting.find(t=>t.id===w.id)?.previousTags ?? w.tags) : w[k]]))),row.identitySha256,row.id);assert.equal(sources.find(r=>r.id===w.id).sha256,row.photoSha256);assert.equal(prices[w.id]?hash(prices[w.id]):null,row.priceSha256)}
 const hashes=new Set(codes.map(hash));for(const digest of baseline.barcodeSha256)assert.ok(hashes.has(digest))
})
