import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createBrandDirectory,brandKey,brands,brandOf} from '../src/brands.ts'
import {matchesWhisky} from '../src/model.ts'
import {responsivePhoto} from '../src/photo-sources.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const catalog=read('../src/catalog.json'),copy=read('../src/product-text.json'),audit=read('../data/tasting-audit-2026-10-19.json'),dictionary=read('../src/english.json')
test('three distinct public IDs stay Other; fourth creates text tile without artwork registration',()=>{
 const three=[1,2,3].map(id=>({id:String(id),brand:'New Whisky'}))
 assert.equal(createBrandDirectory([...three,three[0],{id:'custom-x',brand:'New Whisky',custom:true}]).length,1)
 const four=createBrandDirectory([...three,{id:'4',brand:'New Whisky'}]);assert.equal(four.length,2);assert.equal(four[0].count,4);assert.equal(four[0].logo,'');assert.equal(four[1].count,0)
 assert.equal(createBrandDirectory(three).at(-1).count,3)
})
test('apostrophes, accents, punctuation and parent brand aliases share a public threshold',()=>{
 for(const pair of [['Maker’s Mark',"Makers Mark"],['Ballantine’s',"Ballantine's"],['Johnnie Walker','John Walker & Sons'],['Suntory','Toki'],['Suntory','Hibiki'],['Suntory','Yamazaki'],['Suntory','Hakushu'],['The Macallan','Macallan']])assert.equal(brandKey(pair[0]),brandKey(pair[1]))
 const entries=['Maker’s Mark',"Maker's Mark",'Makers Mark','MÁKERS MARK'].map((brand,i)=>({id:String(i),brand}));assert.equal(createBrandDirectory(entries)[0].count,4)
 assert.equal(brands.length,12);assert.equal(catalog.filter(w=>brandOf(w)==='other').length,56);assert.ok(brands.filter(b=>b.id!=='other').every(b=>b.count>=4));assert.equal(brands.reduce((n,b)=>n+b.count,0),638)
})
test('all forty additions and at least 100 products have individually evidenced bilingual tasting tags',()=>{
 assert.ok(audit.products.length>=100);assert.ok(catalog.filter(w=>w.tags.length).length>=100)
 for(const row of audit.products){const w=catalog.find(w=>w.id===row.id);assert.ok(w);assert.ok(row.source.startsWith('https:'));assert.match(row.sourceSha256,/^[a-f0-9]{64}$/);for(const tag of row.tags){assert.ok(w.tags.includes(tag));assert.ok(row.evidence[tag]);assert.ok(dictionary[tag]);assert.equal(matchesWhisky(w,tag),true);assert.equal(matchesWhisky(w,dictionary[tag]),true)}}
 for(const row of read('../data/popular-expansion-2026-10-19.json').added){assert.ok(audit.products.some(w=>w.id===row.id));assert.ok(copy[row.id].en.length>50)}
})
test('catalogue descriptions use stable IDs and preserve Polish text outside interface dictionary',()=>{
 assert.equal(Object.keys(copy).length,638)
 for(const w of catalog){if(w.description)assert.equal(copy[w.id].pl,w.description);else assert.ok(copy[w.id].pl.length>20);assert.ok(copy[w.id].en.length>30);assert.equal(dictionary[w.description],undefined)}
 assert.match(copy[catalog.find(w=>w.brand==='Talisker').id].en,/pepper/)
})
test('only supported CDN originals get responsive variants; local and Magento sources stay untouched',()=>{
 assert.equal(responsivePhoto('/photos/a.jpg').srcSet,undefined);assert.equal(responsivePhoto('https://www.drankgigant.nl/media/catalog/product/a.png').srcSet,undefined)
 const result=responsivePhoto('https://cdn11.bigcommerce.com/s-test/images/stencil/1024w/photo.jpg').srcSet;assert.match(result,/320w\/photo.jpg 320w/);assert.match(result,/640w\/photo.jpg 640w/)
})
test('all 638 identities, descriptions, edition metadata, photos, prices and codes remain unchanged',async()=>{
 const {createHash}=await import('node:crypto'),baseline=read('../data/quality-preservation-baseline-2026-10-19.json')
 const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value
 const hash=value=>createHash('sha256').update(value).digest('hex')
 assert.equal(catalog.length,638);assert.deepEqual(catalog.map(w=>w.id),baseline.ids)
 const withoutTags=catalog.map(({tags,...w})=>w);assert.equal(hash(JSON.stringify(stable(withoutTags))),baseline.catalogueExcludingAuthorizedTagsSha256)
 for(const [path,expected]of Object.entries(baseline.unchangedFiles))assert.equal(hash(readFileSync(new URL('../'+path,import.meta.url))),expected,path)
})
