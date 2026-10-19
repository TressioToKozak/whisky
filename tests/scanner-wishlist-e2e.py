from indexed_helpers import install_indexed_helpers,open_discovery
from source_images import install_source_images
"""Real Red Label pixels, remembered associations, joined-name search and wishlist totals."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1]
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':900});install_source_images(page);install_indexed_helpers(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();open_discovery(page)
 def scan():page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click()
 def enter(code):page.get_by_label('Numer kodu kreskowego').fill(code);page.get_by_role('button',name='Znajdź butelkę',exact=True).click()
 def journal():return page.evaluate("async () => await readDramJournal()")
 search=page.get_by_role('searchbox',name='Szukaj we wszystkich markach')
 for query in ['Red Label','RedLabel','red label','Johnnie Walker Red Label','johnniewalker redlabel','redlabel johnniewalker']:
  search.fill(query);expect(page.locator('[data-whisky-id="jw-004"]')).to_have_count(1)
 search.fill('');scan();enter('5000267014204');expect(page.get_by_role('alert')).to_contain_text('Sprawdź numer')
 page.get_by_role('button',name='Zamknij',exact=True).click();scan()
 page.get_by_label('Zdjęcie kodu kreskowego').set_input_files(str(R/'tests/fixtures/barcode-red-label.png'))
 expect(page.locator('.barcode-match h3')).to_have_text('Red Label',timeout=30000);expect(page.locator('.barcode-match')).to_contain_text('700 ml');assert journal()['bottles']==[]
 page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);assert journal()['bottles']==[{'whiskyId':'jw-004','quantity':1,'openedCount':0}]
 scan();enter('5000267014203');page.get_by_role('button',name='Dodaj kolejną butelkę',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);assert journal()['bottles'][0]['quantity']==2 and len(journal()['bottles'])==1
 unknown='5901234123457';scan();enter(unknown);expect(page.get_by_text('Kod odczytany.',exact=False)).to_be_visible();page.get_by_role('searchbox',name='Dopasuj whisky do kodu').fill('johnniewalker redlabel')
 page.locator('.barcode-option').filter(has=page.get_by_text('Red Label',exact=True)).click();page.get_by_role('button',name='Dodaj kolejną butelkę',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);assert journal()['custom']==[]
 page.reload(wait_until='networkidle');open_discovery(page);scan();enter(unknown);expect(page.locator('.barcode-match h3')).to_have_text('Red Label');page.get_by_role('button',name='Dodaj kolejną butelkę',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);assert journal()['bottles'][0]['quantity']==4
 # Seed only isolated user state, including an unpriced own entry and a priced bottle in stock.
 cat=json.loads((R/'src/catalog.json').read_text());prices=json.loads((R/'src/prices.json').read_text());custom={**cat[0],'id':'custom-wishlist-test','name':'Test bez wyceny','brand':'Własna marka','series':'Własny wpis','aliases':[],'tags':[],'image':'','source':'','imageSource':'','custom':True}
 page.evaluate("async w=>{const j=(await readDramJournal());j.custom.push(w);j.wishlist=['jw-001','jw-002',w.id];await seedDramJournal(j)}",custom)
 page.reload(wait_until='networkidle');open_discovery(page);page.locator('.bottom-nav').get_by_role('button',name='Życzenia',exact=True).click();total=page.locator('.wishlist-value strong');expected=round(prices['jw-001']['amount']+prices['jw-002']['amount']);expect(total).to_contain_text(str(expected));expect(page.locator('.wishlist-value')).to_contain_text('Bez wyceny: 1 pozycja')
 page.get_by_role('searchbox',name='Szukaj whisky').fill('BlackLabel');expect(page.locator('.whisky-card')).to_have_count(1);expect(total).to_contain_text(str(expected))
 page.reload(wait_until='networkidle');open_discovery(page);page.locator('.bottom-nav').get_by_role('button',name='Życzenia',exact=True).click();expect(total).to_contain_text(str(expected));expect(page.locator('.whisky-card')).to_have_count(3)
 page.get_by_role('button',name='Black Label 12',exact=True).click();page.get_by_role('dialog').get_by_role('button',name='Dodaj do barku',exact=True).click();page.get_by_role('button',name='Zamknij',exact=True).click();expect(total).to_contain_text(str(round(prices['jw-002']['amount'])));assert 'jw-001' not in journal()['wishlist']
 assert not errors,errors
 print({'red_label_real_photo':'passed','repeat_scan_quantity':'passed','invalid_checksum':'passed','unknown_code_catalog_search':'passed','association_after_reload':'passed','joined_name_search':'passed','wishlist_value_filters_missing_prices_persistence':'passed','javascript_errors':errors});b.close()
