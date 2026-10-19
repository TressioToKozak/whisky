from indexed_helpers import install_indexed_helpers,open_discovery
"""Physical bottle screens: PL/EN, keyboard, mobile sizes, WCAG and offline editing."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from source_images import install_source_images
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/');AXE=Path(os.environ.get('AXE_SCRIPT','/tmp/dram-redesign/a11y-tools/node_modules/axe-core/axe.min.js'))
seed={'version':2,'custom':[],'reviews':[],'wishlist':[],'bottles':[{'whiskyId':'jw-001','quantity':2,'openedCount':1}]}
with sync_playwright()as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':900});install_source_images(ctx);install_indexed_helpers(ctx);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();open_discovery(page);page.evaluate('async j=>{await seedDramJournal(j)}',seed);page.reload(wait_until='networkidle');open_discovery(page);violations=[];views=0
 def check(name,width):
  global views
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(name,width)
  for dialog in page.get_by_role('dialog').all():assert dialog.evaluate('x=>x.scrollWidth<=x.clientWidth+1'),(name,width,'dialog overflow')
  views+=1;page.screenshot(path=f'/tmp/dram-v3/ui-{name}-{width}.png')
  if width==390 and AXE.exists():
   page.add_script_tag(path=str(AXE));result=page.evaluate('async()=>{const r=await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}');violations.extend(result)
 for language in ['pl','en']:
  if language=='en':
   page.get_by_role('button',name='Ustawienia',exact=True).click();page.get_by_label('Język',exact=True).select_option('en');page.get_by_role('button',name='Close',exact=True).click()
  for width in [320,375,390,768,1024,1440]:
   page.set_viewport_size({'width':width,'height':900});nav=page.locator('.sidebar nav'if width>=1024 else'.bottom-nav');nav.get_by_role('button',name=('Mój barek'if width>=1024 else'Barek')if language=='pl'else'My cabinet'if width>=1024 else'Cabinet',exact=False).click();page.get_by_role('button',name='Zarządzaj egzemplarzami'if language=='pl'else'Manage individual bottles',exact=True).click();check(language+'-instances',width);page.locator('.instance-open').first.click();editor=page.get_by_role('dialog',name='Szczegóły egzemplarza'if language=='pl'else'Individual bottle details');page.get_by_label('Prywatne notatki egzemplarza'if language=='pl'else'Private bottle notes',exact=True).fill('Notatka testowa z bardzo długim numerem partii i opisem egzemplarza. '*8);check(language+'-editor',width)
   page.keyboard.press('Tab');assert page.evaluate('(()=>{const ds=[...document.querySelectorAll("dialog[open]")];return ds.at(-1).contains(document.activeElement)})()');page.keyboard.press('Escape');expect(editor).to_have_count(0);page.get_by_role('dialog',name='Egzemplarze w kolekcji'if language=='pl'else'Individual bottles in your collection').get_by_role('button',name='Zamknij'if language=='pl'else'Close',exact=True).click()
 # Existing loaded app can mutate locally offline; cold offline restart is covered by phase2-e2e.py.
 page.set_viewport_size({'width':390,'height':900});page.get_by_role('button',name='Manage individual bottles',exact=True).click();page.locator('.instance-open').first.click();ctx.set_offline(True);page.get_by_label('Private bottle notes',exact=True).fill('Saved locally without a network connection');page.get_by_role('button',name='Save individual bottle',exact=True).click();expect(page.get_by_role('dialog',name='Individual bottle details')).to_have_count(0);assert page.evaluate('async ()=>(await readDramJournal()).ownedBottles.some(b=>b.notes==="Saved locally without a network connection")');ctx.set_offline(False)
 assert not violations,violations;assert not errors,errors
 print({'new_views':views,'languages':['pl','en'],'widths':[320,375,390,768,1024,1440],'keyboard_and_escape':True,'axe_executed':AXE.exists(),'axe_violations':violations,'offline_edit_in_loaded_app':True,'offline_restart_shell':'covered by phase2-e2e.py','javascript_errors':errors});browser.close()
