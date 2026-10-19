"""Phase 2: real IDB, mapped CSV, portable exports, themes, keyboard/axe and offline cold start."""
import os,json,csv,io,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from source_images import install_source_images
from indexed_helpers import install_indexed_helpers
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/');OUT=Path('/tmp/dram-phase2');OUT.mkdir(exist_ok=True)
AXE=Path(os.environ.get('AXE_PATH',str(Path(__file__).resolve().parents[1]/'node_modules/axe-core/axe.min.js')))
assert AXE.is_file(), 'Install npm dependencies: axe-core is a mandatory accessibility check'
with sync_playwright()as p:
 engine=os.environ.get('DRAM_BROWSER','chromium');browser_type=getattr(p,engine)
 launch={'headless':True}
 if engine=='chromium':launch.update(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 browser=browser_type.launch(**launch);context=browser.new_context(viewport={'width':390,'height':900},accept_downloads=True);install_source_images(context);install_indexed_helpers(context);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();expect(page.get_by_role('heading',name='Twoja kolekcja whisky.')).to_be_visible();expect(page.get_by_role('heading',name='Zacznij od swojej pierwszej butelki')).to_be_visible()
 def journal():return page.evaluate('async()=>await readDramJournal()')
 def settings():page.get_by_role('button',name='Ustawienia',exact=True).click()
 def close():page.get_by_role('dialog').get_by_role('button',name='Zamknij',exact=True).click()
 def upload(text):page.get_by_label('Import CSV',exact=True).set_input_files({'name':'collection.csv','mimeType':'text/csv','buffer':text.encode()})
 initial=page.evaluate('localStorage.getItem("dram.journal.v3")');settings()
 # Unknown release and invalid amount cannot change collection or enable confirmation.
 upload('whisky_id,amount,currency\nmissing,25,EUR\njw-001,25,\n');expect(page.get_by_role('alert')).to_contain_text('Popraw błędne');assert len(journal()['ownedBottles'])==0;expect(page.get_by_role('button',name='Importuj egzemplarze',exact=True)).to_be_disabled();page.get_by_role('button',name='Anuluj',exact=True).click()
 # Explicit mapping of Polish headings, multiline notes, duplicate preview, pre-import JSON.
 text='identyfikator;nazwa;koszt;waluta;notatka\njw-001;Black Label;25,50;EUR;"=HYPERLINK(\"\"x\"\")\nprywatna"\njw-002;Red Label;15;EUR;"druga"\njw-002;Red Label;15;EUR;"druga"\n'
 upload(text);page.get_by_label('ID whisky',exact=True).select_option('0');page.get_by_label('Cena zakupu',exact=True).select_option('2');page.get_by_label('Waluta zakupu',exact=True).select_option('3');page.get_by_label('Notatki',exact=True).select_option('4');expect(page.get_by_text('Pominięte duplikaty ID',exact=False)).to_contain_text('1');page.locator('.csv-confirm input').check()
 with page.expect_download()as before:page.get_by_role('button',name='Importuj egzemplarze',exact=True).click()
 assert json.loads(Path(before.value.path()).read_text())['ownedBottles']==[];expect(page.get_by_role('dialog',name='Import CSV',exact=True)).to_have_count(0);assert len(journal()['ownedBottles'])==2;assert journal()['ownedBottles'][0]['purchase']['amount']==25.5;assert page.evaluate('localStorage.getItem("dram.journal.v3")')==initial
 with page.expect_download()as d:page.get_by_role('button',name='Eksport CSV',exact=True).click()
 exported=list(csv.reader(io.StringIO(Path(d.value.path()).read_text(encoding='utf-8-sig'))));assert len(exported)==3;assert exported[1][-1].startswith("'=HYPERLINK");assert exported[1][-1].endswith('\nprywatna')
 with page.expect_download()as d:page.get_by_role('button',name='Eksport XLSX',exact=True).click()
 with zipfile.ZipFile(d.value.path())as z:
  assert z.testzip()is None
  for name in z.namelist():ET.fromstring(z.read(name))
  worksheet=z.read('xl/worksheets/sheet1.xml').decode();assert '<f>'not in worksheet;assert '<v>25.5</v>'in worksheet;assert 'prywatna'in worksheet
 # Exported IDs make reimport idempotent. Do not overwrite earlier attachments or history.
 upload('\n'.join(','.join('"'+v.replace('"','""')+'"'for v in row)for row in exported));expect(page.get_by_text('Pominięte duplikaty ID',exact=False)).to_contain_text('2');expect(page.get_by_role('button',name='Importuj egzemplarze',exact=True)).to_be_disabled();page.get_by_role('button',name='Anuluj',exact=True).click()
 page.get_by_label('Wygląd',exact=True).select_option('light');expect(page.locator('html')).to_have_attribute('data-theme','light');page.get_by_label('Język',exact=True).select_option('en');expect(page.get_by_label('Appearance',exact=True)).to_have_value('light');page.get_by_role('button',name='Close',exact=True).click();expect(page.get_by_role('heading',name='Your whisky collection.',exact=True)).to_be_visible()
 # All responsive widths and both palettes, including colour-contrast checks when axe supplied.
 accessibility=[]
 if AXE.exists():page.add_script_tag(path=str(AXE))
 for theme in ['light','dark']:
  page.get_by_role('button',name='Settings',exact=True).click();page.get_by_label('Appearance',exact=True).select_option(theme);page.get_by_role('button',name='Close',exact=True).click()
  for width in [320,375,390,768,1024,1440]:
   page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width);page.screenshot(path=str(OUT/f'home-{theme}-{width}.png'))
  if AXE.exists():
   violations=page.evaluate('async()=> (await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations');assert not violations,[(v['id'],[(n['target'],n['failureSummary'])for n in v['nodes']])for v in violations];accessibility.append(theme)
 page.set_viewport_size({'width':390,'height':900});page.locator('.bottom-nav').get_by_role('button',name='Discover',exact=True).click();page.get_by_role('searchbox').fill('4003922041836');expect(page.locator('.whisky-card')).to_have_count(1);expect(page.locator('.card-title')).to_contain_text('Black Label');page.get_by_role('searchbox').fill('johnie walker black');expect(page.locator('[data-whisky-id="jw-001"]')).to_be_visible()
 # Wait for complete, atomic shell installation. Then destroy all pages and load with network cut.
 page.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration())?.active');page.wait_for_function('async()=> (await caches.keys()).some(k=>k.startsWith("dram-shell-"))');saved=journal();page.close();context.set_offline(True);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');expect(page.get_by_role('heading',name='Your whisky collection.',exact=True)).to_be_visible();assert journal()==saved;expect(page.locator('.offline-status')).to_contain_text('Offline');page.locator('.bottom-nav').get_by_role('button',name='Cabinet',exact=True).click();page.get_by_role('button',name='Manage individual bottles',exact=True).click();page.locator('.instance-open').first.click();page.get_by_label('Private bottle notes',exact=True).fill('Saved fully offline');page.get_by_role('button',name='Save individual bottle',exact=True).click();expect(page.get_by_role('dialog',name='Individual bottle details',exact=True)).to_have_count(0);page.close();page=context.new_page();page.goto(BASE,wait_until='networkidle');assert any(b['notes']=='Saved fully offline'for b in journal()['ownedBottles']);page.locator('.bottom-nav').get_by_role('button',name='Discover',exact=True).click();page.get_by_role('searchbox').fill('Jameson');assert page.locator('.whisky-card').count()>0
 assert not errors,errors
 print({'browser':engine,'real_idb_and_immutable_migration_copy':True,'csv_mapping_validation_duplicates_backup':True,'xlsx_valid_zip_xml_no_formulas':True,'light_dark_six_widths':True,'axe_palettes':accessibility,'barcode_and_typo_search':True,'cold_restart_without_network':True,'offline_edit_and_second_restart':True,'javascript_errors':errors});browser.close()
