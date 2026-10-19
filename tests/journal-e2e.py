"""Backups, legacy migration, real two-tab conflicts and stock counts with transactional storage."""
from source_images import install_source_images
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/');KEY='dram.journal.v3';LEGACY='dram.journal.v1'
catalog=json.loads((R/'src/catalog.json').read_text());custom={**catalog[0],'id':'custom-migration','brand':'Moja marka','name':'Moja butelka','series':'Własna kolekcja','image':'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6H2sAAAAASUVORK5CYII=','source':'','imageSource':'','custom':True}
old={'version':1,'custom':[custom],'reviews':[{'id':'review-migrate','whiskyId':'jw-001','score':8.5,'date':'2026-10-18','tags':['Dym'],'note':'Moja oryginalna notatka'}],'bottles':[{'whiskyId':'jw-001','quantity':4,'opened':True}],'wishlist':['jw-002'],'barcodeLinks':[{'code':'05901234123457','whiskyId':'custom-migration'}]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':900},accept_downloads=True);install_source_images(ctx);a=ctx.new_page();errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.goto(BASE,wait_until='networkidle');a.get_by_role('button',name='Tak, mam 18 lat').click();a.evaluate('(data)=>{localStorage.removeItem("dram.journal.v2");localStorage.removeItem("dram.journal.v3");localStorage.setItem("dram.journal.v1",JSON.stringify(data))}',old);a.reload(wait_until='networkidle');a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3"))?.version===3')
 def journal(page=a):return page.evaluate('JSON.parse(localStorage.getItem("dram.journal.v3"))')
 def nav(page,name):page.locator('.bottom-nav').get_by_role('button',name=name,exact=True).click()
 def settings(page=a):page.get_by_role('button',name='Ustawienia',exact=True).click()
 assert journal()['bottles']==[{'whiskyId':'jw-001','quantity':4,'openedCount':1}];assert journal()['reviews']==old['reviews'];assert journal()['barcodeLinks']==old['barcodeLinks'];assert journal()['custom'][0]['image']==custom['image'];assert a.evaluate('JSON.parse(localStorage.getItem("dram.journal.v1"))')==old
 b=ctx.new_page();b.on('pageerror',lambda e:errors.append(str(e)));b.goto(BASE,wait_until='networkidle');nav(a,'Barek');nav(b,'Barek');a.locator('.card-title').click();a.get_by_role('button',name='Zwiększ liczbę otwartych butelek',exact=True).click();expect(a.get_by_label('Liczba otwartych butelek',exact=True)).to_have_text('2');a.get_by_role('button',name='Zamknij',exact=True).click();expect(b.locator('.card-stock')).to_contain_text('Otwarte: 2')
 b.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click();b.get_by_label('Numer kodu kreskowego').fill('4003922041836');b.get_by_role('button',name='Znajdź butelkę',exact=True).click();b.get_by_role('button',name='Dodaj kolejną butelkę',exact=True).click();expect(a.locator('.card-stock')).to_contain_text('5 szt.');assert journal()['bottles'][0]['openedCount']==2
 a.get_by_role('button',name='Filtry',exact=True).click()
 for name in ['Otwarte','Nieotwarte']:
  a.get_by_role('group',name='Stan butelek').get_by_role('button',name=name,exact=True).click();expect(a.locator('.whisky-card')).to_have_count(1)
 # A stale full replacement waits on the same lock and cannot replace a successful action.
 for page,query in [(a,'Black Label 12'),(b,'Red Label')]:
  nav(page,'Odkrywaj');page.get_by_role('searchbox').fill(query);page.locator('[data-whisky-id="'+('jw-001' if page==a else 'jw-004')+'"] .card-title').click()
 a.evaluate('()=>{window.lockHeld=false;navigator.locks.request("dram.journal.write.v2",()=>{window.lockHeld=true;return new Promise(resolve=>window.releaseJournalLock=resolve)})}');a.wait_for_function('window.lockHeld')
 a.get_by_role('button',name='Chcę spróbować',exact=True).click();b.get_by_role('button',name='Chcę spróbować',exact=True).click();a.evaluate('window.releaseJournalLock()');a.get_by_role('button',name='Zamknij',exact=True).click();b.get_by_role('button',name='Zamknij',exact=True).click();a.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).wishlist.length===2')
 assert len(set(journal()['wishlist'])&{'jw-001','jw-004'})==1
 failed=b if b.locator('.storage-alert').count() else a;expect(failed.locator('.storage-alert')).to_contain_text('innej karcie');expect(failed.get_by_role('button',name='Pobierz niezapisane zmiany')).to_be_visible()
 with failed.expect_download() as draftdl:failed.get_by_role('button',name='Pobierz niezapisane zmiany').click()
 assert json.loads(Path(draftdl.value.path()).read_text())['version']==3
 failed.get_by_role('button',name='Zamknij komunikat',exact=True).click()
 # Export includes uploaded image, counts, notes, wishes and associations. Invalid import is inert.
 settings(a)
 with a.expect_download() as dl:a.get_by_role('button',name='Eksportuj dane',exact=True).click()
 exported=json.loads(Path(dl.value.path()).read_text());assert exported==journal();assert exported['custom'][0]['image']==custom['image'];before=journal()
 a.get_by_label('Importuj dane',exact=True).set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{broken'});expect(a.get_by_role('alert')).to_contain_text('poprawnym JSON');assert journal()==before
 a.get_by_label('Importuj dane',exact=True).set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':json.dumps(old).encode()});expect(a.get_by_role('dialog',name='Zastąpić obecny dziennik?')).to_be_visible();assert journal()==before
 with a.expect_download() as pre:a.get_by_role('button',name='Pobierz kopię obecnych danych',exact=True).click()
 assert json.loads(Path(pre.value.path()).read_text())==before
 a.get_by_role('button',name='Anuluj',exact=True).click();assert journal()==before
 # The import's confirmation token must reject stock changed in another tab.
 a.get_by_label('Importuj dane',exact=True).set_input_files({'name':'stale.json','mimeType':'application/json','buffer':json.dumps(old).encode()});nav(b,'Barek');b.locator('.card-stock button').click();b.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles[0].quantity===6');a.get_by_role('button',name='Przywróć dane',exact=True).click();expect(a.get_by_role('dialog',name='Zastąpić obecny dziennik?').get_by_role('alert')).to_contain_text('Import nie został zapisany');assert journal()['bottles'][0]['quantity']==6;a.get_by_role('button',name='Anuluj',exact=True).click()
 a.get_by_label('Importuj dane',exact=True).set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':json.dumps(old).encode()});a.get_by_role('button',name='Przywróć dane',exact=True).click();expect(a.get_by_role('dialog')).to_have_count(1);a.get_by_role('button',name='Zamknij',exact=True).click();assert journal()['bottles'][0]=={'whiskyId':'jw-001','quantity':4,'openedCount':1};nav(b,'Barek');expect(b.locator('.card-stock')).to_contain_text('4 szt.')
 # Edits opened before a remote review change retain a recoverable draft instead of overwriting.
 for page in [a,b]:
  nav(page,'Oceny');page.get_by_role('button',name='Edytuj wpis',exact=True).click()
 a.get_by_label('Twoje wrażenia',exact=False).fill('Mój niezapisany szkic');b.get_by_label('Twoje wrażenia',exact=False).fill('Nowsza notatka z drugiej karty');b.get_by_role('button',name='Zapisz degustację',exact=True).click();expect(b.get_by_role('dialog')).to_have_count(0);a.get_by_role('button',name='Zapisz degustację',exact=True).click();expect(a.get_by_role('dialog').get_by_role('alert')).to_contain_text('pozostaje w formularzu');expect(a.get_by_label('Twoje wrażenia',exact=False)).to_have_value('Mój niezapisany szkic');assert journal()['reviews'][0]['note']=='Nowsza notatka z drugiej karty';a.get_by_role('button',name='Zamknij',exact=True).click();expect(a.get_by_role('button',name='Pobierz niezapisane zmiany')).to_be_visible();a.get_by_role('button',name='Zamknij komunikat',exact=True).click()
 # Old-version tabs can only change the retained v1 copy, never the active v2 data.
 before=journal();b.evaluate('(old)=>{localStorage.setItem("dram.journal.v1",JSON.stringify({...old,wishlist:[]}))}',old);expect(a.locator('.storage-alert')).to_contain_text('Starsza wersja');assert journal()==before;a.get_by_role('button',name='Zamknij komunikat',exact=True).click()
 # A browser without Web Locks still shares the IndexedDB coordination lock.
 b.close();b=ctx.new_page();b.add_init_script('Object.defineProperty(navigator,"locks",{value:undefined})');b.goto(BASE,wait_until='networkidle');nav(b,'Barek');b.locator('.card-stock button').click();expect(a.locator('.sidebar .nav-item').first).to_be_attached();b.wait_for_function('JSON.parse(localStorage.getItem("dram.journal.v3")).bottles[0].quantity===5');assert journal()['bottles'][0]['openedCount']==1
 # Corruption propagates protection; valid explicit import restores without deleting legacy backup.
 b.evaluate('localStorage.setItem("dram.journal.v3","{corrupt")');expect(a.locator('.storage-alert')).to_contain_text('nie zostanie nadpisany');settings(a);a.get_by_label('Importuj dane',exact=True).set_input_files({'name':'restore.json','mimeType':'application/json','buffer':json.dumps(before).encode()});a.get_by_role('button',name='Przywróć dane',exact=True).click();expect(a.get_by_role('dialog')).to_have_count(1);a.get_by_role('button',name='Zamknij',exact=True).click();assert journal()==before
 assert not errors,errors
 print({'v1_migration_and_old_key_retained':True,'open_closed_counts_and_scanner':True,'two_tab_sync_and_stale_write_rejection':True,'review_draft_recovery':True,'full_backup_roundtrip':True,'invalid_import_inert':True,'confirmation_and_pre_import_backup':True,'WebLocks_fallback':True,'corruption_recovery':True});browser.close()
