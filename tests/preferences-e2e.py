from source_images import install_source_images
"""Language/market switching preserves journal data and applies to every valuation."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/')
catalog=json.loads((R/'src/catalog.json').read_text());quotes=json.loads((R/'src/prices.json').read_text());fx=json.loads((R/'src/exchange-rate-pln.json').read_text())
budget=next(w for w in catalog if w['brand']=='Golden Loch' and w['age'] is None)
ref=next(w for w in catalog if quotes.get(w['id'],{}).get('referenceOnly'))
seed={'version':2,'custom':[],'bottles':[{'whiskyId':'jw-001','quantity':3,'openedCount':1},{'whiskyId':budget['id'],'quantity':1,'openedCount':0}], 'wishlist':['jw-004',ref['id'],budget['id']],'reviews':[{'id':'keep-note','whiskyId':'jw-001','score':8.5,'date':'2026-10-18','note':'Moja notatka zostaje po polsku','tags':['Dym']}]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});install_source_images(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("if(!localStorage.getItem('dram.journal.v2')){localStorage.setItem('dram.age','yes');localStorage.setItem('dram.journal.v2',"+json.dumps(json.dumps(seed))+')}' )
 page.goto(BASE,wait_until='networkidle');expect(page.locator('.brand-card')).to_have_count(12)
 before=page.evaluate("JSON.parse(localStorage.getItem('dram.journal.v2'))")
 page.get_by_role('button',name='Ustawienia',exact=True).click();page.get_by_label('Język',exact=True).select_option('en')
 expect(page.get_by_role('heading',name='Settings',exact=True)).to_be_visible();expect(page.get_by_label('Region',exact=True)).to_have_value('NL');expect(page.locator('html')).to_have_attribute('lang','en')
 page.get_by_label('Region',exact=True).select_option('PL');page.get_by_role('button',name='Close',exact=True).click()
 page.get_by_role('button',name='Open Other',exact=False).click();expect(page.get_by_role('heading',name='Other',exact=False)).to_be_visible()
 expect(page.locator('.whisky-card').first.locator('.card-price')).to_contain_text('PLN');ids=page.locator('.whisky-card').evaluate_all('(xs)=>xs.map(x=>x.dataset.whiskyId)');values=[quotes[w]['amount'] for w in ids if w in quotes];assert values==sorted(values)
 page.get_by_role('button',name='Original',exact=True).first.click();expect(page.get_by_role('dialog')).to_contain_text('Origin');page.get_by_text('Price source and details',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('Converted reference, not a local retail offer.');expect(page.get_by_role('dialog')).to_contain_text('1 EUR =');page.get_by_role('button',name='Close',exact=True).click()
 page.locator('.bottom-nav').get_by_role('button',name='Cabinet',exact=True).click();price=round(quotes['jw-001']['amount']*fx['PLNperEUR']*100)/100;expect(page.locator('.cellar-value')).to_contain_text('PLN');expect(page.locator('.cellar-value')).to_contain_text(str(round(price*3)));expect(page.locator('.cellar-value')).to_contain_text('Unpriced: 1 bottle')
 page.locator('.bottom-nav').get_by_role('button',name='Wishlist',exact=True).click();expect(page.locator('.wishlist-value')).to_contain_text('PLN');expect(page.locator('.wishlist-value')).to_contain_text('Unpriced: 2 items')
 page.get_by_role('button',name='Settings',exact=True).click();page.get_by_label('Region',exact=True).select_option('NL');page.get_by_role('button',name='Close',exact=True).click();expect(page.locator('.wishlist-value')).to_contain_text('€');expect(page.locator('.bottom-nav')).to_contain_text('Discover')
 page.reload(wait_until='networkidle');expect(page.locator('html')).to_have_attribute('lang','en');page.get_by_role('button',name='Settings',exact=True).click();expect(page.get_by_label('Region',exact=True)).to_have_value('NL');page.get_by_label('Region',exact=True).select_option('PL');page.get_by_label('Language',exact=True).select_option('pl');expect(page.get_by_label('Region',exact=True)).to_have_value('PL');page.get_by_role('button',name='Zamknij',exact=True).click()
 page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click();page.get_by_label('Numer kodu kreskowego').fill('20005009');page.get_by_role('button',name='Znajdź butelkę',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('Queen Margot');expect(page.get_by_role('dialog')).to_contain_text('700 ml');page.get_by_role('button',name='Zamknij',exact=True).click()
 page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click();page.get_by_label('Zdjęcie kodu kreskowego').set_input_files(str(R/'tests/fixtures/barcode-queen-margot-ean8.png'));expect(page.locator('.barcode-match')).to_contain_text('Queen Margot',timeout=20000);page.get_by_role('button',name='Zamknij',exact=True).click()
 assert page.evaluate("JSON.parse(localStorage.getItem('dram.journal.v2'))")==before
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});page.get_by_role('button',name='Ustawienia',exact=True).click();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.get_by_role('button',name='Zamknij',exact=True).click()
 assert not errors,errors
 print({'language_and_region_independent':True,'PLN_and_EUR_cards_and_totals':True,'conversion_provenance':True,'journal_unchanged':True,'supermarket_EAN8':True,'settings_persisted':True,'responsive':True});b.close()
