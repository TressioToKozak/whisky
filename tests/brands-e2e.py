"""Brand navigation, all placeholders, shared journal, photos and price ordering."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:5173/whisky/')
catalog=json.loads((Path(__file__).resolve().parents[1]/'src/catalog.json').read_text())
prices=json.loads((Path(__file__).resolve().parents[1]/'src/prices.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click()
 expect(page.get_by_role('heading',name='Wybierz markę')).to_be_visible();expect(page.locator('.brand-card')).to_have_count(9)
 assert page.locator('footer, .settings-panel').count()==0
 assert page.locator('.brand-logo img').evaluate_all('(xs)=>xs.every(x=>x.complete&&x.naturalWidth>0)')
 for name in ['Jim Beam','Goldfinch','Ardbeg','Bushmills','Ballantine’s','Toki','Chivas Regal']:
  page.get_by_role('button',name='Otwórz '+name,exact=True).click()
  expected_brand=[w for w in catalog if w['brand']==name]
  expect(page.locator('.whisky-card')).to_have_count(len(expected_brand))
  page.locator(".whisky-card img").evaluate_all("xs=>xs.forEach(x=>x.loading='eager')")
  page.wait_for_function("Array.from(document.querySelectorAll('.whisky-card img')).every(x=>x.complete&&x.naturalWidth>0)")
  ids=page.locator('.whisky-card').evaluate_all('(xs)=>xs.map(x=>x.dataset.whiskyId)');values=[prices[x]['amount'] for x in ids];assert values==sorted(values) and min(values)>0
  page.get_by_role('button',name='Wszystkie marki',exact=True).click()
 page.get_by_role('button',name='Otwórz Jack Daniel’s',exact=True).click()
 while page.get_by_role('button',name='Pokaż kolejne whisky',exact=True).count():page.get_by_role('button',name='Pokaż kolejne whisky',exact=True).click()
 expected=[w for w in catalog if w['brand']=="Jack Daniel's"]
 expect(page.locator('.whisky-card')).to_have_count(len(expected));ids=page.locator('.whisky-card').evaluate_all('(xs)=>xs.map(x=>x.dataset.whiskyId)');values=[prices[x]['amount'] for x in ids];assert values==sorted(values)
 page.get_by_role('combobox',name='Sortuj whisky').select_option('price-desc');first=page.locator('.whisky-card').first.get_attribute('data-whisky-id');assert prices[first]['amount']==max(values)
 page.get_by_role('searchbox').fill('Blackberry');expect(page.locator('.whisky-card')).to_have_count(1);page.get_by_role('button',name='Tennessee Blackberry',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('35%');page.get_by_text('Źródło ceny i szczegóły',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('Topdrinks');page.get_by_role('button',name='Zamknij',exact=True).click()
 page.get_by_role('button',name='Dodaj do życzeń: Tennessee Blackberry',exact=True).click();page.get_by_role('button',name='Wszystkie marki',exact=True).click();page.get_by_role('button',name='Otwórz Johnnie Walker',exact=True).click();page.get_by_role('searchbox').fill('Seasonal Blends 16 · Winter');expect(page.locator('.whisky-card')).to_have_count(1);photo=page.locator('.whisky-card img');assert 'inset(' in photo.get_attribute('style');page.get_by_role('button',name='Dodaj do życzeń:',exact=False).click()
 page.locator('.bottom-nav').get_by_role('button',name='Życzenia',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(2)
 page.reload(wait_until='networkidle');page.locator('.bottom-nav').get_by_role('button',name='Życzenia',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(2)
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.locator('.bottom-nav').get_by_role('button',name='Odkrywaj',exact=True).click();expect(page.get_by_role('heading',name='Wybierz markę')).to_be_visible()
 # Older personal records from brands outside the curated nine must remain discoverable.
 custom={**catalog[0],'id':'custom-legacy-unknown-brand','brand':'Glenfiddich','name':'Własna stara butelka','image':'','source':'','imageSource':'','custom':True}
 page.evaluate("""(custom)=>{const data=JSON.parse(localStorage.getItem('dram.journal.v1'));data.custom.push(custom);localStorage.setItem('dram.journal.v1',JSON.stringify(data))}""",custom)
 page.reload(wait_until='networkidle');page.get_by_role('button',name='Moje własne wpisy',exact=False).click();expect(page.get_by_role('button',name='Własna stara butelka',exact=True)).to_be_visible()
 assert not errors,errors
 print({'brand_logos':9,'populated_brands':9,'jack_releases':len(expected),'ascending_and_descending_prices':'passed','source_details':'passed','shared_journal_persistence':'passed','original_photo_framing':'passed','responsive_layout':'passed','javascript_errors':errors});b.close()
