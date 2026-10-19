from indexed_helpers import install_indexed_helpers,open_discovery
from source_images import install_source_images
"""Cross-brand discovery and valuation through real persisted journal interactions."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:5173/whisky/')
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'src/catalog.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});install_source_images(page);install_indexed_helpers(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();open_discovery(page)
 search=page.get_by_role('searchbox',name='Szukaj we wszystkich markach')
 search.fill('ballantines sweet');expect(page.locator('.whisky-card')).to_have_count(1);expect(page.locator('.whisky-card')).to_contain_text('Sweet Blend');expect(page.locator('.card-price')).to_contain_text('19')
 page.wait_for_function("document.querySelector('.whisky-card img')?.naturalWidth>0");page.screenshot(path='/tmp/dram-global-search.png')
 page.get_by_role('button',name='Dodaj do barku',exact=True).click();page.get_by_role('button',name='Sweet Blend',exact=True).click()
 expect(page.get_by_role('dialog')).to_contain_text('30%');page.get_by_role('button',name='Zwiększ liczbę butelek').click();page.get_by_role('button',name='Zwiększ liczbę butelek').click();page.get_by_role('button',name='Zamknij',exact=True).click()
 page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click();expect(page.locator('.cellar-value strong')).to_contain_text('57')
 page.get_by_role('searchbox',name='Szukaj whisky').fill('brak takiej whisky');expect(page.locator('.whisky-card')).to_have_count(0);expect(page.locator('.cellar-value strong')).to_contain_text('57')
 # The sum covers the entire cellar even when its list is filtered.
 custom={**catalog[0],'id':'custom-unpriced-valuation','brand':'Własna marka','name':'Bez ceny','image':'','source':'','imageSource':'','custom':True}
 page.evaluate("""async w=>{const j=(await readDramJournal());j.custom.push(w);for(let i=0;i<2;i++)j.ownedBottles.push({...structuredClone(j.ownedBottles[0]),id:'fixture-unpriced-'+i,whiskyId:w.id,status:'closed'});j.bottles.push({whiskyId:w.id,quantity:2,openedCount:0});await seedDramJournal(j)}""",custom)
 page.reload(wait_until='networkidle');open_discovery(page);page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click();expect(page.locator('.cellar-value')).to_contain_text('Bez wyceny: 2 butelki');expect(page.locator('.cellar-value strong')).to_contain_text('57');page.screenshot(path='/tmp/dram-cellar-value.png')
 page.locator('.bottom-nav').get_by_role('button',name='Odkrywaj',exact=True).click();search=page.get_by_role('searchbox',name='Szukaj we wszystkich markach');search.fill('Dolce');expect(page.locator('.whisky-card')).to_have_count(1);expect(page.locator('.card-brand')).to_have_text('Ardbeg')
 search.fill('glenfiddich');expect(page.locator('.whisky-card')).to_have_count(24);page.get_by_role('button',name='Pokaż kolejne whisky').click();expect(page.locator('.whisky-card')).to_have_count(len([w for w in catalog if w['brand']=='Glenfiddich']))
 search.fill('xyznotawhisky');expect(page.get_by_role('heading',name='Nie znaleźliśmy takiej whisky')).to_be_visible();page.get_by_role('button',name='Wyczyść wyszukiwanie').click();expect(page.locator('.brand-card')).to_have_count(12)
 page.locator('.brand-glenfiddich').scroll_into_view_if_needed();page.screenshot(path='/tmp/dram-glen-logo.png')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 assert not errors,errors
 print({'global_search':'passed','apostrophe_insensitive':'passed','cross_brand_results':'passed','pagination':'passed','cellar_quantities':'passed','unpriced_bottles':'passed','value_independent_of_filters':'passed','persistence':'passed','responsive':'passed','javascript_errors':errors});b.close()
