import test from'node:test'
import assert from'node:assert/strict'
import {parseCSV,guessMapping,previewCSV,exportCSV,exportXLSX,tableRows}from'../src/tabular.ts'
import {emptyCollection}from'../src/collection-model.ts'
const catalog=[{id:'a',name:'Example whisky',brand:'Brand'}]
test('CSV quoted separators, BOM, CRLF, escaped quotes and multiline notes parse without losing text',()=>{
 assert.deepEqual(parseCSV('whisky_id,"notes;a;b"\na,"x;y"'),[['whisky_id','notes;a;b'],['a','x;y']])
 const rows=parseCSV('\uFEFFwhisky_id;notes;amount;currency\r\na;"note; line\r\n""quoted""";25,50;EUR\r\n');assert.equal(rows[1][1],'note; line\r\n"quoted"');assert.equal(rows[1][2],'25,50')
 for(const raw of ['id\na,b','id\n"unfinished','id\n"bad"tail'])assert.throws(()=>parseCSV(raw))
})
test('preview maps fields, validates money and known release, and handles duplicates explicitly',()=>{
 const rows=parseCSV('whisky_id,status,amount,currency,notes\na,open,25.50,EUR,private\na,open,25.50,EUR,private'),mapping=guessMapping(rows[0]),j=emptyCollection()
 const result=previewCSV(rows,mapping,j,catalog,'merge');assert.equal(result.added,1);assert.equal(result.duplicates,1);assert.deepEqual(result.errors,[]);assert.equal(result.data.ownedBottles[0].purchase.amount,25.5);assert.equal(result.data.ownedBottles[0].createdAt,null)
 const whitespace=previewCSV([rows[0],['a','closed','25','EUR','  keep whitespace \n']],mapping,j,catalog,'merge');assert.equal(whitespace.data.ownedBottles[0].notes,'  keep whitespace \n')
 const again=previewCSV(rows,mapping,result.data,catalog,'merge');assert.equal(again.added,0);assert.equal(again.duplicates,2)
 const replace=previewCSV(rows,mapping,result.data,catalog,'replace');assert.equal(replace.data.ownedBottles.length,1)
 for(const row of ['missing,closed,25,EUR,note','a,closed,25,,note','a,closed,-1,EUR,note','a,fake,25,EUR,note'])assert.equal(previewCSV([rows[0],row.split(',')],mapping,j,catalog,'merge').errors.length,1)
 assert.throws(()=>previewCSV(rows,{name:0,whisky_id:0},j,catalog,'merge'),/raz/)
})
test('CSV and XLSX protect executable formulas and preserve Unicode; XLSX contains only inline strings and numeric cells',()=>{
 const rows=[['name','notes','amount'],['Żółta whisky','=HYPERLINK("bad")',25.5],['@bad',' \t+1','-1'],['x','-formula',0]],csv=exportCSV(rows)
 assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("' \t+1"));assert.ok(csv.includes('"25.5"'))
 const bytes=exportXLSX(rows);assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50)
 const text=new TextDecoder().decode(bytes);assert.ok(text.includes('Żółta whisky'));assert.ok(text.includes('t="inlineStr"'));assert.ok(!text.includes('<f>'));assert.ok(text.includes('<v>25.5</v>'))
 assert.equal(tableRows(emptyCollection(),catalog).length,1)
})
