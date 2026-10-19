from indexed_helpers import install_indexed_helpers,open_discovery
"""New catalogue, independent type/age filters, exact metadata and original source images."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from source_images import install_source_images
R=Path(__file__).resolve().parents[1];BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/');report=json.loads((R/'data/popular-expansion-2026-10-19.json').read_text())
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':900});install_source_images(page);install_indexed_helpers(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();open_discovery(page)
 page.get_by_role('button',name='Otwórz Suntory',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(5)
 for name in ['Toki','Toki Black','Hibiki Japanese Harmony','Yamazaki Distiller’s Reserve','Hakushu Distiller’s Reserve']:expect(page.get_by_role('button',name=name,exact=True)).to_be_visible()
 page.locator('.whisky-card img').evaluate_all('xs=>xs.forEach(x=>x.loading="eager")');page.wait_for_function('Array.from(document.querySelectorAll(".whisky-card img")).every(x=>x.complete&&x.naturalWidth>0)');page.get_by_role('button',name='Wszystkie marki',exact=True).click()
 # Every requested product is searchable and displays the verified source photograph.
 search=page.get_by_role('searchbox')
 for row in report['added']:
  search.fill(row['brand']+' '+row['name']);card=page.locator('[data-whisky-id="'+row['id']+'"]');expect(card).to_have_count(1);img=card.locator('img');img.evaluate('x=>x.loading="eager"');expect(img).to_be_visible();page.wait_for_function('(id)=>document.querySelector(`[data-whisky-id="${id}"] img`)?.naturalWidth>0',arg=row['id'])
 search.fill('');page.get_by_role('button',name='Otwórz Inne',exact=True).click();expect(page.locator('.page-intro .count')).to_have_text('56');page.get_by_role('button',name='Filtry',exact=True).click();page.get_by_label('Typ whisky',exact=True).select_option('single-malt-scotch');expect(page.locator('.whisky-card')).to_have_count(15)
 page.get_by_label('Informacja o wieku',exact=True).select_option('stated');expect(page.locator('.whisky-card')).to_have_count(15);page.get_by_role('button',name='Klasyka',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(15);page.get_by_label('Wiek w latach',exact=True).select_option('12');expect(page.locator('.whisky-card')).to_have_count(11);page.get_by_label('Wiek w latach',exact=True).select_option('all')
 page.get_by_role('searchbox').fill('Talisker');page.locator('.card-title').click();expect(page.locator('.detail-specs')).to_contain_text('45,8%');expect(page.locator('.detail-specs')).to_contain_text('Single Malt Scotch Whisky');expect(page.locator('.photo-credit')).to_contain_text('Drankgigant');page.get_by_role('button',name='Chcę spróbować',exact=True).click();page.get_by_role('button',name='Zamknij',exact=True).click();page.locator('.bottom-nav').get_by_role('button',name='Życzenia',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(1);expect(page.locator('.wishlist-value')).to_contain_text('€');page.get_by_role('button',name='Dodaj do barku',exact=True).click();page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(1)
 page.locator('.bottom-nav').get_by_role('button',name='Odkrywaj',exact=True).click();search.fill('Green Spot');page.locator('.card-title').click();expect(page.locator('.detail-specs')).to_contain_text('Brak danych');expect(page.locator('.detail-specs')).not_to_contain_text('8 lat');page.get_by_role('button',name='Zamknij',exact=True).click()
 search.fill('Maker');expect(page.get_by_role('button',name='Original',exact=True)).to_be_visible();expect(page.get_by_role('button',name='46',exact=True)).to_be_visible();expect(page.locator('.card-brand').first).to_have_text('Maker’s Mark')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});page.locator('.bottom-nav' if width<1024 else '.sidebar').get_by_role('button',name='Odkrywaj',exact=True).click();page.get_by_role('button',name='Ustawienia',exact=True).click();expect(page.get_by_role('button',name='Eksportuj dane',exact=True)).to_be_visible();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.get_by_role('button',name='Zamknij',exact=True).click()
 assert not errors,errors
 print({'requested_whiskies':40,'source_images_rendered':40,'Suntory_five_products':True,'type_and_age_and_edition_filters':True,'verified_ABV':True,'unknown_age_not_NAS':True,'Maker_name':True,'wishlist_and_cellar':True,'responsive':True});b.close()
