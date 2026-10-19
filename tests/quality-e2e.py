"""Fast app-only CI: no retailer requests. Live source checks are a separate command."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from source_images import install_source_images
ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/');KEY='dram.journal.v3'
cat=json.loads((ROOT/'src/catalog.json').read_text());copy=json.loads((ROOT/'src/product-text.json').read_text());errors=[];console=[]
with sync_playwright()as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':900});install_source_images(ctx)
 def watch(page):
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:console.append(m.text)if m.type=='error'and 'net::ERR_FAILED'not in m.text else None)
 a=ctx.new_page();watch(a);a.goto(BASE,wait_until='networkidle');a.get_by_role('button',name='Tak, mam 18 lat').click();expect(a.locator('.brand-card')).to_have_count(12)
 assert all(len({w['id']for w in cat if w['brand']==name})<4 for name in ['The Macallan','Four Roses','Maker’s Mark','Wild Turkey'])
 for name in ['Jameson','Johnnie Walker','Jack Daniel’s','Jim Beam','Goldfinch','Ardbeg','Bushmills','Ballantine’s','Suntory','Glenfiddich','Chivas Regal','Inne']:expect(a.get_by_role('button',name='Otwórz '+name,exact=False)).to_be_visible()
 a.get_by_role('button',name='Otwórz Inne',exact=True).click();expect(a.locator('.page-intro .count')).to_have_text('56');a.get_by_role('button',name='Filtry',exact=True).click();a.get_by_label('Marka',exact=True).select_option('makersmark');expect(a.locator('.whisky-card')).to_have_count(2);a.get_by_label('Typ whisky',exact=True).select_option('bourbon');expect(a.locator('.whisky-card')).to_have_count(2);a.get_by_role('searchbox').fill('46');expect(a.locator('.whisky-card')).to_have_count(1)
 a.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click();expect(a.get_by_label('Marka',exact=True)).to_have_count(0);a.locator('.bottom-nav').get_by_role('button',name='Odkrywaj',exact=True).click();a.get_by_role('searchbox').fill('peat');assert a.locator('.whisky-card').count()>0
 # Product copy and translated aroma search share stable IDs.
 print('Product copy and translated aroma search share stable IDs.',flush=True)
 a.get_by_role('searchbox').fill('Talisker 10');a.locator('.card-title').click();a.locator('.detail-description summary').click();expect(a.locator('.detail-description')).to_contain_text(next(w['description']for w in cat if w['brand']=='Talisker'));a.get_by_role('button',name='Zamknij',exact=True).click();a.get_by_role('button',name='Ustawienia',exact=True).click();a.get_by_label('Język',exact=True).select_option('en');a.get_by_role('button',name='Close',exact=True).click();a.locator('.card-title').click();a.locator('.detail-description summary').click();expect(a.locator('.detail-description')).to_contain_text(copy[next(w['id']for w in cat if w['brand']=='Talisker')]['en']);a.get_by_role('button',name='Close',exact=True).click();a.get_by_role('button',name='Settings',exact=True).click();a.get_by_label('Language',exact=True).select_option('pl');a.get_by_role('button',name='Zamknij',exact=True).click()
 # Failed remote image must render named fallback in both card and detail, without page errors.
 print('Failed remote image must render named fallback in both card and detail, without page errors.',flush=True)
 ctx.route('**/media/catalog/product/t/a/talisker_10_year_1.png*',lambda route:route.abort())
 a.reload(wait_until='networkidle');a.get_by_role('searchbox').fill('Talisker 10');expect(a.locator('.photo-missing')).to_contain_text('Talisker');a.locator('.card-title').click();expect(a.locator('.detail-photo .photo-missing')).to_contain_text('Talisker');a.get_by_role('button',name='Zamknij',exact=True).click()
 ctx.unroute('**/media/catalog/product/t/a/talisker_10_year_1.png*')
 a.get_by_role('searchbox').fill('Black Label 12');a.locator('[data-whisky-id="jw-001"]').get_by_role('button',name='Dodaj do barku',exact=True).click();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles.some(b=>b.whiskyId==="jw-001")')
 def nav(page,name):page.locator('.bottom-nav').get_by_role('button',name=name,exact=True).click()
 nav(a,'Barek');expect(a.locator('[data-whisky-id="jw-001"]')).to_be_visible()
 # Hold the normal writer lock in another live tab so refresh occurs before any async write.
 print('Hold the normal writer lock in another live tab so refresh occurs before any async write.',flush=True)
 b=ctx.new_page();watch(b);b.goto(BASE,wait_until='networkidle')
 def hold():b.evaluate('()=>{window.held=false;navigator.locks.request("dram.journal.write.v2",()=>{window.held=true;return new Promise(r=>window.release=r)})}');b.wait_for_function('window.held')
 def release():b.evaluate('window.release()')
 hold();a.locator('.card-stock button').evaluate('(button)=>{button.click();button.click();button.click();location.reload()}');a.wait_for_load_state('domcontentloaded');release();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles.find(b=>b.whiskyId==="jw-001").quantity===4');nav(a,'Barek');expect(a.locator('.card-stock')).to_contain_text('4 szt.')
 a.locator('.card-title').click();hold();a.get_by_role('button',name='Zwiększ liczbę otwartych butelek',exact=True).evaluate('(button)=>{button.click();location.reload()}');a.wait_for_load_state('domcontentloaded');release();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles[0].openedCount===1');nav(a,'Barek');a.locator('.card-title').click()
 hold();a.get_by_role('button',name='Chcę spróbować',exact=True).evaluate('(button)=>{button.click();location.reload()}');a.wait_for_load_state('domcontentloaded');release();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).wishlist.includes("jw-001")');nav(a,'Barek');a.locator('.card-title').click()
 # Close instead of refresh after a decrement; next tab recovers durable intent.
 print('Close instead of refresh after a decrement; next tab recovers durable intent.',flush=True)
 hold();a.get_by_role('button',name='Zmniejsz liczbę butelek',exact=True).click();assert a.evaluate('Object.keys(localStorage).some(k=>k.startsWith("dram.journal.pending.v3."))');a.close();release();a=ctx.new_page();watch(a);a.goto(BASE,wait_until='networkidle');a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles[0].quantity===3')
 # Save a note, navigate immediately, then reload; the note is committed or recovered.
 print('Save a note, navigate immediately, then reload; the note is committed or recovered.',flush=True)
 nav(a,'Barek');a.locator('.card-title').click();a.get_by_role('button',name='Zapisz degustację',exact=True).click();a.get_by_label('Twoje wrażenia',exact=False).fill('Szybka notatka pozostaje');hold();a.get_by_role('button',name='Zapisz degustację',exact=True).evaluate('(button)=>{button.click();location.reload()}');a.wait_for_load_state('domcontentloaded');release();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).reviews.some(r=>r.note==="Szybka notatka pozostaje")')
 # Mobile and desktop layouts after changes.
 print('Mobile and desktop layouts after changes.',flush=True)
 for width in [320,375,390,768,1024,1440]:
  a.set_viewport_size({'width':width,'height':900});a.locator('.mobile-brand'if width<1024 else'.sidebar .brand').click();expect(a.locator('.brand-card')).to_have_count(12);assert not a.evaluate('document.documentElement.scrollWidth>innerWidth'),width
 # Deletion remains explicitly confirmed.
 print('Deletion remains explicitly confirmed.',flush=True)
 a.set_viewport_size({'width':390,'height':900});nav(a,'Barek');a.locator('.card-title').click();
 for quantity in [2,1]:
  a.get_by_role('button',name='Zmniejsz liczbę butelek',exact=True).click();expect(a.get_by_label('Liczba butelek',exact=True)).to_have_text(str(quantity))
 a.get_by_role('button',name='Zmniejsz liczbę butelek',exact=True).click();a.get_by_role('button',name='Potwierdź',exact=True).click();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles.length===0')
 assert not errors,errors
 assert not console,console
 print({'startup_search_brand_type_filters':True,'real_catalogue_threshold':True,'PL_EN_product_descriptions_and_aromas':True,'named_photo_fallback':True,'stock_add_remove_and_open_counts':True,'rapid_refresh_and_close_recovery':True,'review_wishlist_recovery':True,'responsive_widths':[320,375,390,768,1024,1440],'javascript_errors':errors,'console_errors':console});browser.close()
