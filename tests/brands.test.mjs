import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {brands,brandOf} from '../src/brands.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const catalog=read('../src/catalog.json'),sources=read('../data/brand-sources.json'),layout=read('../src/photo-layout.json')
test('brand catalog separates Johnnie Walker and Jack Daniel’s, with six empty placeholders',()=>{
 assert.equal(brands.length,8)
 assert.equal(catalog.filter(w=>brandOf(w)==='johnnie-walker').length,253)
 assert.ok(catalog.filter(w=>brandOf(w)==='jack-daniels').length>100)
 for(const b of brands.slice(2))assert.equal(catalog.filter(w=>brandOf(w)===b.id).length,0)
 assert.equal(brandOf({brand:'Jack Daniel’s'}),'jack-daniels');assert.equal(brandOf({brand:'John Walker & Sons'}),'johnnie-walker')
})
test('all brand choices use local source-verified logos',()=>{
 for(const b of brands){const record=sources.find(s=>s.id===b.id);assert.ok(record);const file=new URL('../public/brands/'+b.logo,import.meta.url);assert.ok(existsSync(file));assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),record.sha256);assert.match(record.sourcePage,/^https:\/\//)}
})
test('every original photograph has non-destructive display framing metadata',()=>{
 for(const w of catalog){assert.ok(layout[w.id]);assert.match(layout[w.id].inset,/^inset\(/);const edges=layout[w.id].inset.match(/[\d.]+/g).map(Number);assert.equal(edges.length,4);assert.ok(edges[0]+edges[2]<100);assert.ok(edges[1]+edges[3]<100);assert.match(layout[w.id].background,/^(linear-gradient|#fff)/)}
})
