"""Seeded personal journal used only in isolated tests, never as application demo data."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:5173/whisky/')
SHOTS=Path(os.environ.get('DRAM_SCREENSHOTS','/tmp/dram-redesign/screenshots'));SHOTS.mkdir(parents=True,exist_ok=True)
cat=json.loads((ROOT/'src/catalog.json').read_text());black=next(w for w in cat if w['id']=='jw-001');glen=next(w for w in cat if w['brand']=='Glenfiddich' and w['name']=='14 Year Bourbon Barrel Reserve');blue=next(w for w in cat if w['id']=='jw-002')
custom={**black,'id':'custom-redesign-fixture','brand':'Własny wpis testowy','name':'Whisky bez wyceny','image':'','imageSource':'','source':'','custom':True}
seed={'version':1,'custom':[custom],'bottles':[{'whiskyId':black['id'],'quantity':2,'opened':True},{'whiskyId':glen['id'],'quantity':1,'opened':False},{'whiskyId':custom['id'],'quantity':1,'opened':False}],'wishlist':[blue['id']],'reviews':[{'id':'test-note-1','whiskyId':black['id'],'score':8.5,'date':'2026-10-16','note':'Wpis testowy: własne wrażenia z degustacji przy kolacji.\nNotatka do kontroli układu dziennika.','tags':['Dym','Wanilia']},{'id':'test-note-2','whiskyId':glen['id'],'score':7,'date':'2026-10-18','note':'Notatka testowa — zapis z kolejnego spotkania degustacyjnego.','tags':['Owoce']}],'barcodeLinks':[{'code':'05901234123457','whiskyId':custom['id']}]}
axe_path=Path(os.environ.get('AXE_SCRIPT','/tmp/dram-redesign/a11y-tools/node_modules/axe-core/axe.min.js'))
violations=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();expect(page.locator('.brand-card')).to_have_count(11);expect(page.locator('.home-collection, .last-tasting, .add-top, .sidebar-note')).to_have_count(0)
 page.evaluate("j=>localStorage.setItem('dram.journal.v1',JSON.stringify(j))",seed);page.reload(wait_until='networkidle')
 def nav(index):
  selector='.sidebar nav button' if page.viewport_size['width']>=1024 else '.bottom-nav button'
  page.locator(selector).nth(index).click()
 def check(name,width,axe=False):
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(name,width,'page overflow')
  dialog=page.get_by_role('dialog')
  if dialog.count():assert dialog.evaluate('(x)=>x.scrollWidth<=x.clientWidth+1'),(name,width,'sheet overflow')
  small=page.evaluate("""()=>Array.from(document.querySelectorAll('body *')).filter(x=>x instanceof HTMLElement&&x.checkVisibility()&&Array.from(x.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(x).fontSize)<11).map(x=>({tag:x.tagName,cls:x.className,size:getComputedStyle(x).fontSize,text:x.textContent.slice(0,45)}))""")
  assert not small,(name,width,'small text',small)
  targets=page.locator('.wish-button, .add-bar, .card-title, .icon-button, .tag-field button, .quantity button, .collection-switch button')
  for target in targets.all():
   if target.is_visible():
    box=target.bounding_box();assert box['height']>=43.8 and box['width']>=43.8,(name,width,'small target',target.get_attribute('class'),box)
  for logo in page.locator('.brand-logo').all():
   if logo.is_visible():
    assert logo.evaluate('(x)=>{const a=x.getBoundingClientRect(),b=x.querySelector("img").getBoundingClientRect();return b.top>=a.top-1&&b.bottom<=a.bottom+1&&b.left>=a.left-1&&b.right<=a.right+1}'),(name,width,'logo overflow')
  for card in page.locator('.whisky-card:not(.journal-card)').all():
   assert card.locator('.add-bar, .card-stock button').count()<=1,(name,width,'multiple card actions')
  page.screenshot(path=str(SHOTS/f'{width}-{name}.png'))
  if axe and axe_path.exists():
   if not page.evaluate('Boolean(window.axe)'):page.add_script_tag(path=str(axe_path))
   findings=page.evaluate("""async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}""")
   if findings:violations.append({'view':name,'width':width,'violations':findings})
  checks.append([width,name])
  (SHOTS/'accessibility-results.json').write_text(json.dumps({'checks':checks,'axe_executed':axe_path.exists(),'violations':violations,'javascript_errors':errors},ensure_ascii=False,indent=2))
 for width in [320,375,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':900});nav(0);expect(page.locator('.home-collection, .last-tasting, .add-top, .sidebar-note')).to_have_count(0);check('home',width,width in [390,1440])
  page.get_by_role('button',name='Otwórz Johnnie Walker',exact=False).click();check('catalog',width,width in [390,1440])
  # A real long archived edition must remain readable without truncation.
  longest=max((w for w in cat if w['brand'] in ['Johnnie Walker','John Walker & Sons']),key=lambda w:len(w['name']))
  page.get_by_role('searchbox',name='Szukaj whisky').fill(longest['name']);expect(page.locator('.whisky-card')).to_have_count(1);check('long-name',width)
  nav(1);expect(page.locator('.cellar-value')).to_contain_text('Bez wyceny: 1 butelka');expect(page.locator('.collection-card')).to_have_count(3);check('cellar',width,width==390)
  nav(2);expect(page.locator('.whisky-card')).to_have_count(1);expect(page.locator('.wishlist-value strong')).to_contain_text('€');check('wishlist',width,width==390)
  nav(3);expect(page.locator('.journal-card')).to_have_count(2);expect(page.locator('.journal-card').first).to_contain_text(glen['name']);check('journal',width,width in [390,1440])
  page.get_by_role('button',name=black['name'],exact=True).click();expect(page.locator('.detail-sources')).to_have_count(0);check('detail',width,width in [320,390])
  if width==390:
   for _ in range(18):
    page.keyboard.press('Tab');assert page.evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"),'Focus escaped modal'
   for _ in range(3):page.keyboard.press('Shift+Tab');assert page.evaluate("document.querySelector('dialog[open]').contains(document.activeElement)")
   page.keyboard.press('Escape');expect(page.get_by_role('dialog')).to_have_count(0);assert page.evaluate("document.activeElement.textContent.trim()")==black['name']
   page.get_by_role('button',name=black['name'],exact=True).click()
  page.get_by_role('button',name='Zapisz degustację',exact=True).click();check('tasting-form',width,width in [320,390]);page.get_by_role('button',name='Zamknij',exact=True).click()
  nav(0);page.get_by_role('button',name='Brakuje whisky w katalogu?',exact=True).click();check('own-entry',width,width==390);page.get_by_role('button',name='Zamknij',exact=True).click()
  page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click();check('scanner',width,width==390);page.get_by_role('button',name='Zamknij',exact=True).click()
  print('width',width,'passed',flush=True)
 # Check the new inline collection management and filter against persisted state.
 page.set_viewport_size({'width':390,'height':900});nav(1);card=page.locator(f'.collection-card[data-whisky-id="{black["id"]}"]');card.get_by_role('button',name='Dodaj sztukę:',exact=False).click();expect(card.locator('.card-stock')).to_contain_text('3 szt.');page.get_by_role('button',name='Filtry',exact=True).click();page.get_by_role('group',name='Stan butelek').get_by_role('button',name='Otwarte',exact=True).click();expect(page.locator('.collection-card')).to_have_count(1);expect(page.locator('.cellar-value strong')).to_contain_text('101')
 page.reload(wait_until='networkidle');saved=page.evaluate("JSON.parse(localStorage.getItem('dram.journal.v1'))");assert saved['version']==1 and saved['barcodeLinks']==seed['barcodeLinks'] and saved['reviews']==seed['reviews'];assert saved['bottles'][0]['quantity']==3
 assert page.evaluate("getComputedStyle(document.querySelector('.scan-top')).transitionDuration")=='0s'
 (SHOTS/'accessibility-results.json').write_text(json.dumps({'checks':checks,'axe_executed':axe_path.exists(),'violations':violations,'javascript_errors':errors},ensure_ascii=False,indent=2))
 assert not violations,json.dumps(violations,ensure_ascii=False)
 assert not errors,errors
 print({'responsive_views':len(checks),'widths':[320,375,390,768,1024,1440],'keyboard_focus_and_escape':'passed','inline_stock_and_filters':'passed','legacy_journal_and_barcode_links':'passed','minimum_font':'11px','primary_targets':'44px','reduced_motion':'passed','axe_wcag_a_aa':'passed' if axe_path.exists() else 'not run','javascript_errors':errors});b.close()
