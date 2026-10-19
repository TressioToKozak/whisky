from indexed_helpers import install_indexed_helpers,open_discovery
from source_images import install_source_images
"""New brand, source-backed bottle sizes, real shared GTINs and remembered edition choice."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];BASE=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/');catalog=json.loads((R/'src/catalog.json').read_text());jameson=next(w for w in catalog if w['brand']=='Jameson' and w['name']=='Original')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':900});install_source_images(page);install_indexed_helpers(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click();open_discovery(page);expect(page.locator('.brand-card')).to_have_count(12);logo=page.locator('.brand-jameson img');page.wait_for_function("document.querySelector('.brand-jameson img')?.naturalWidth>0")
 page.get_by_role('button',name='Otwórz Jameson',exact=True).click();expect(page.locator('.whisky-card')).to_have_count(len([w for w in catalog if w['brand']=='Jameson']));page.locator(f'[data-whisky-id="{jameson["id"]}"] .card-title').click();expect(page.locator('.detail-specs')).to_contain_text('700 ml');expect(page.locator('.detail-specs')).to_contain_text('40%');page.get_by_text('Źródło ceny i szczegóły',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('Drankgigant');page.get_by_role('button',name='Zamknij',exact=True).click()
 def scan(code):
  page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click();page.get_by_label('Numer kodu kreskowego').fill(code);page.get_by_role('button',name='Znajdź butelkę',exact=True).click()
 scan('5011007003005');expect(page.locator('.barcode-match h3')).to_have_text('Original');expect(page.locator('.barcode-match')).to_contain_text('700 ml');page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).click()
 # Retailers publish this same GTIN for the 2023 and 2024 McLaren labels. Never auto-pick one.
 scan('5099873026045');expect(page.locator('.barcode-match')).to_have_count(0);expect(page.get_by_text('Ten kod pasuje do kilku wydań.',exact=False)).to_be_visible();page.locator('.barcode-option').filter(has=page.get_by_text('McLaren X JD Edition 2024',exact=True)).click();page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);page.reload(wait_until='networkidle');open_discovery(page);scan('5099873026045');expect(page.locator('.barcode-match h3')).to_have_text('McLaren X JD Edition 2024');page.get_by_role('button',name='Zamknij',exact=True).click()
 saved=page.evaluate("async () => await readDramJournal()");assert saved['version']==3 and saved['bottles'][0]['whiskyId']==jameson['id'];assert saved['bottles'][0]['quantity']==1
 # A different-capacity reference remains visible, but cannot inflate either collection.
 prices=json.loads((R/'src/prices.json').read_text());ref=next(w for w in catalog if prices.get(w['id'],{}).get('referenceOnly'))
 page.evaluate("async w=>{const j=(await readDramJournal());j.wishlist=[w.id];j.ownedBottles.push({...structuredClone(j.ownedBottles[0]),id:'fixture-reference-only',whiskyId:w.id,status:'closed'});j.bottles.push({whiskyId:w.id,quantity:1,openedCount:0});await seedDramJournal(j)}",ref)
 page.reload(wait_until='networkidle');open_discovery(page);page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click()
 expected=sum(prices[bottle['whiskyId']]['amount']*bottle['quantity'] for bottle in saved['bottles'] if not prices[bottle['whiskyId']].get('referenceOnly'))
 formatted=page.evaluate("n=>new Intl.NumberFormat('pl-PL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)",expected)
 expect(page.locator('.cellar-value strong')).to_have_text(formatted);expect(page.locator('.cellar-value')).to_contain_text('Bez wyceny: 1 butelka')
 page.locator('.bottom-nav').get_by_role('button',name='Życzenia',exact=True).click();expect(page.locator('.wishlist-value strong')).to_contain_text('0');expect(page.locator('.card-price')).to_contain_text('ref.');page.locator('.card-title').click();expect(page.locator('.reference-price-note')).to_contain_text('poza sumą')
 assert not errors,errors
 print({'jameson_original_size_source_and_gtin':'passed','shared_real_gtin_requires_edition_choice':'passed','personal_choice_after_reload':'passed','legacy_journal':'passed','incompatible_reference_excluded_from_totals':'passed','javascript_errors':errors});b.close()
