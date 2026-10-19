from source_images import install_source_images
"""Functional browser checks. Run against a running Vite server or preview.
DRAM_URL=http://127.0.0.1:5173/whisky/ python tests/e2e.py
Requires Python playwright and Chromium (CHROMIUM_PATH can override its path).
"""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get('DRAM_URL', 'http://127.0.0.1:5173/whisky/')
ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    page = ctx.new_page();install_source_images(page)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE, wait_until='networkidle')
    expect(page.get_by_role('dialog', name='Witaj w Dram')).to_be_visible()
    page.get_by_role('button',name='Tak, mam 18 lat').click()
    page.get_by_role('button',name='Otwórz Johnnie Walker',exact=False).click()
    catalog_count = len([w for w in json.loads((ROOT/'src/catalog.json').read_text()) if w['brand'] in ['Johnnie Walker','John Walker & Sons']])
    expect(page.locator('.whisky-card')).to_have_count(min(24,catalog_count))
    page.get_by_role('button', name='Pokaż kolejne whisky').click()
    expect(page.locator('.whisky-card')).to_have_count(min(48,catalog_count))
    page.get_by_role('searchbox', name='Szukaj whisky').fill('Honour')
    expect(page.locator('.whisky-card')).to_have_count(1)
    page.get_by_role('searchbox', name='Szukaj whisky').fill('nie-ma-takiej-whisky-zz')
    expect(page.get_by_role('heading', name='Nie znaleźliśmy takiej whisky')).to_be_visible()
    page.get_by_role('button',name='Wyczyść filtry').click()
    page.get_by_role('button',name='Filtry',exact=True).click()
    page.get_by_role('button',name='Edycja specjalna',exact=True).click()
    assert page.locator('.whisky-card').count() > 0
    page.get_by_role('button',name='Wszystkie whisky',exact=True).click()
    page.get_by_role('button',name='Black Label 12',exact=True).click()
    page.get_by_role('button',name='Chcę spróbować',exact=True).click()
    page.get_by_role('button',name='Zamknij',exact=True).click()
    page.locator('.bottom-nav').get_by_role('button',name='Życzenia').click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    page.locator('.whisky-card').get_by_role('button',name='Dodaj do barku',exact=True).click()
    expect(page.get_by_role('heading',name='Lista życzeń jest pusta')).to_be_visible()
    page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    page.get_by_role('button',name='Black Label 12',exact=True).click()
    page.get_by_role('button',name='Zwiększ liczbę butelek').click()
    expect(page.get_by_label('Liczba butelek',exact=True)).to_have_text('2')
    page.get_by_role('button',name='Zwiększ liczbę otwartych butelek',exact=True).click()
    page.get_by_role('button',name='Zapisz degustację').click()
    page.get_by_role('slider',name='Twoja ocena').fill('8.5')
    page.get_by_role('button',name='Miód',exact=True).click()
    page.get_by_role('textbox',name='Twoje wrażenia').fill('Miód, łagodny dym. Długi finisz.')
    page.get_by_role('button',name='Zapisz degustację',exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('dialog',name='Witaj w Dram')).not_to_be_visible()
    page.locator('.bottom-nav').get_by_role('button',name='Oceny',exact=True).click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    expect(page.locator('.card-rating')).to_contain_text('8,5')
    page.get_by_role('button',name='Black Label 12',exact=True).click()
    page.locator('.review-section > summary').click()
    expect(page.get_by_role('dialog',name='Poznaj whisky').get_by_text('Miód, łagodny dym. Długi finisz.',exact=True)).to_be_visible()
    expect(page.get_by_label('Liczba otwartych butelek',exact=True)).to_have_text('1')
    expect(page.get_by_label('Liczba butelek',exact=True)).to_have_text('2')
    page.get_by_role('button',name='Edytuj',exact=True).click()
    page.get_by_role('slider',name='Twoja ocena').fill('9')
    page.get_by_role('button',name='Zapisz degustację',exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.locator('.card-rating')).to_contain_text('9,0')
    page.locator('.bottom-nav').get_by_role('button',name='Odkrywaj',exact=True).click()
    page.get_by_role('button',name='Brakuje whisky w katalogu?',exact=True).click()
    page.get_by_role('textbox',name='Nazwa / edycja').fill('Własne wydanie testowe')
    page.get_by_role('textbox',name='Notatka').fill('Moja butelka testowa')
    page.get_by_label('Dodaj zdjęcie whisky').set_input_files(str(ROOT/'public'/json.loads((ROOT/'src/catalog.json').read_text())[0]['image'].lstrip('/')))
    expect(page.get_by_alt_text('Wybrane zdjęcie whisky')).to_be_visible()
    page.get_by_role('dialog').get_by_role('button',name='Dodaj whisky',exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click()
    expect(page.locator('.whisky-card')).to_have_count(2)
    exported=page.evaluate("JSON.parse(localStorage.getItem('dram.journal.v2'))")
    assert len(exported['bottles'])==2 and exported['reviews'][0]['score']==9
    assert exported['custom'][0]['image'].startswith('data:image/jpeg;')
    page.get_by_role('button',name='Własne wydanie testowe',exact=True).click()
    page.get_by_role('button',name='Usuń własny wpis').click()
    page.get_by_role('button',name='Anuluj',exact=True).click()
    expect(page.get_by_role('dialog',name='Poznaj whisky').get_by_role('heading',name='Własne wydanie testowe',exact=True)).to_be_visible()
    page.get_by_role('button',name='Usuń własny wpis').click()
    page.get_by_role('button',name='Potwierdź',exact=True).click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    assert page.evaluate('document.body.style.overflow')!='hidden', 'Nested dialog left scrolling locked'
    # Remove cellar stock without losing the tasting history.
    page.get_by_role('button',name='Black Label 12',exact=True).click()
    page.get_by_role('button',name='Zmniejsz liczbę butelek').click()
    page.get_by_role('button',name='Zmniejsz liczbę butelek').click()
    page.get_by_role('button',name='Potwierdź',exact=True).click()
    page.locator('.review-section > summary').click()
    expect(page.get_by_role('dialog',name='Poznaj whisky').get_by_text('Miód, łagodny dym. Długi finisz.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Zamknij',exact=True).click()
    page.locator('.bottom-nav').get_by_role('button',name='Oceny',exact=True).click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    # Layout must fit even a small phone. Photos are local and original files.
    for width in [320,360,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Overflow at {width}'
    for w in json.loads((ROOT/'src/catalog.json').read_text()):
        if w['image'] and not w['image'].startswith('https://'):
            response=page.request.get(BASE+w['image'].lstrip('/'))
            assert response.status==200
            assert response.headers['content-type'].startswith('image/')
    # Corrupt local data must never be silently overwritten.
    page.evaluate("localStorage.setItem('dram.journal.v2','BROKEN-BACKUP')")
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('alert')).to_contain_text('Dotychczasowy zapis nie zostanie nadpisany')
    assert page.evaluate("localStorage.getItem('dram.journal.v2')")=='BROKEN-BACKUP'
    assert not errors, errors
    print(json.dumps({'passed':['age gate','search and filters','wishlist to cellar','stock and opened status','tasting create/edit','persistence','custom whisky and photo','deletion confirmation','cellar removal preserves reviews','responsive 320–1440px','local photo responses','corruption protection'],'page_errors':errors},ensure_ascii=False))
    b.close()
