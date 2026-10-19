import {readFileSync,writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {brands} from '../src/brands.ts'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
export function catalogStats(){
 const catalog=read('../src/catalog.json'),prices=read('../src/prices.json'),codes=read('../src/barcodes.json')
 return {products:catalog.length,brands:new Set(catalog.map(w=>w.brand)).size,brandGroups:brands.length,namedBrandGroups:brands.filter(b=>b.id!=='other').length,uniqueBarcodes:new Set(codes.map(e=>e.code)).size,barcodedEditions:new Set(codes.map(e=>e.whiskyId)).size,quoted:catalog.filter(w=>prices[w.id]).length,unquoted:catalog.filter(w=>!prices[w.id]).length,excludedPriceReferences:catalog.filter(w=>prices[w.id]?.referenceOnly).length,countries:new Set(catalog.map(w=>w.country).filter(c=>c!=='Nieustalone')).size,unconfirmedCountries:catalog.filter(w=>w.country==='Nieustalone').length}
}
export function statsBlock(){const s=catalogStats();return `<!-- catalog-stats:start -->\n| Aktualny katalog | Liczba |\n| --- | ---: |\n| Wydań | ${s.products} |\n| Nazw marek w katalogu | ${s.brands} |\n| Grup wyboru | ${s.brandGroups} (${s.namedBrandGroups} marek + „Inne”) |\n| Potwierdzonych kodów | ${s.uniqueBarcodes} |\n| Wydań z potwierdzonym kodem | ${s.barcodedEditions} |\n| Wycenionych pozycji | ${s.quoted} |\n| Pozycji bez wyceny | ${s.unquoted} |\n| Referencji poza sumą kolekcji | ${s.excludedPriceReferences} |\n| Krajów pochodzenia | ${s.countries} |\n| Pozycji z nieustalonym krajem | ${s.unconfirmedCountries} |\n<!-- catalog-stats:end -->`}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=new URL('../README.md',import.meta.url),content=readFileSync(file,'utf8'),block=statsBlock(),updated=content.replace(/<!-- catalog-stats:start -->[\s\S]*?<!-- catalog-stats:end -->/,block)
 if(process.argv.includes('--write')){if(updated===content&&!content.includes(block))throw Error('README statistics markers missing');writeFileSync(file,updated)}
 else if(process.argv.includes('--check')){if(!content.includes(block))throw Error('README statistics are stale. Run node scripts/catalog-stats.mjs --write')}
 else console.log(JSON.stringify(catalogStats(),null,2))
}
