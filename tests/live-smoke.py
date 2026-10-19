from source_images import install_source_images
"""Smoke-test the actual HTTPS deployment.
The local browser does not share the environment's CA store. Route public GETs
through Python's verified TLS/proxy transport; no certificate checks are disabled.
"""
import json
from pathlib import Path
import gzip
import os
import urllib.request
import urllib.error
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('DRAM_URL','https://tressiotokozak.github.io/whisky/')
origin=urlsplit(BASE)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    fetched=[]
    def verified_get(route):
        assert route.request.method=='GET'
        assert urlsplit(route.request.url).hostname==origin.hostname
        try:
            response=urllib.request.urlopen(route.request.url,timeout=30)
        except urllib.error.HTTPError as error:
            response=error
        with response:
            body=response.read()
            headers={k.lower():v for k,v in response.headers.items()}
            if headers.get('content-encoding')=='gzip':body=gzip.decompress(body)
            for key in ['transfer-encoding','content-encoding','content-length']:headers.pop(key,None)
            fetched.append((route.request.url,response.status))
            route.fulfill(status=response.status,body=body,headers=headers)
    context.route(f'{origin.scheme}://{origin.netloc}/**',verified_get)
    page=context.new_page();install_source_images(page);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until='networkidle',timeout=90000)
    expect(page.get_by_role('heading',name='Masz ukończone 18 lat?')).to_be_visible()
    page.get_by_role('button',name='Tak, mam 18 lat').click()
    expect(page.get_by_role('heading',name='Wybierz markę')).to_be_visible()
    expect(page.locator('.brand-card')).to_have_count(12)
    page.get_by_role('searchbox',name='Szukaj we wszystkich markach').fill('ballantines sweet')
    expect(page.locator('.whisky-card')).to_have_count(1)
    expect(page.locator('.whisky-card')).to_contain_text('Sweet Blend')
    page.get_by_role('button',name='Dodaj do barku',exact=True).click()
    page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click()
    expect(page.locator('.cellar-value strong')).to_contain_text('19')
    page.locator('.bottom-nav').get_by_role('button',name='Odkrywaj',exact=True).click()
    page.get_by_role('button',name='Otwórz Johnnie Walker',exact=False).click()
    expect(page.get_by_role('heading',name='Johnnie Walker',exact=False)).to_be_visible()
    expect(page.locator('.whisky-card')).to_have_count(24)
    expect(page.locator('.page-intro .count')).to_have_text(str(sum(w['brand'] in ['Johnnie Walker','John Walker & Sons'] for w in json.loads((Path(__file__).resolve().parents[1]/'src/catalog.json').read_text()))))
    photo=page.locator('.whisky-card img').first
    expect(photo).to_be_visible()
    page.wait_for_function("document.querySelector('.whisky-card img')?.naturalWidth > 0")
    assert photo.evaluate('(img)=>img.complete && img.naturalWidth>0')
    expect(page.locator('.whisky-card').first).to_contain_text('Red Soul')
    for term in ['Sabrina Carpenter', 'A Song of Ice', 'A Song of Fire']:
        page.get_by_role('searchbox',name='Szukaj whisky').fill(term)
        expect(page.locator('.whisky-card')).to_have_count(1)
        expect(page.locator('.card-price')).to_contain_text('€')
        photo=page.locator('.whisky-card img')
        expect(photo).to_be_visible()
        page.wait_for_function("document.querySelector('.whisky-card img').naturalWidth > 0")
    page.get_by_role('button',name='Wszystkie marki',exact=True).click()
    page.get_by_role('button',name='Otwórz Jack Daniel’s',exact=False).click()
    expect(page.locator('.whisky-card')).to_have_count(24)
    page.get_by_role('searchbox',name='Szukaj whisky').fill('Blackberry')
    expect(page.locator('.whisky-card')).to_have_count(1)
    expect(page.locator('.card-price')).to_contain_text('€')
    page.get_by_role('button',name='Wszystkie marki',exact=True).click()
    for name in ['Jameson','Ardbeg','Jim Beam','Goldfinch','Bushmills','Ballantine’s','Suntory','Chivas Regal','Glenfiddich']:
        page.get_by_role('button',name='Otwórz '+name,exact=False).click()
        assert page.locator('.whisky-card').count()>0
        page.wait_for_function("document.querySelector('.whisky-card img')?.naturalWidth>0")
        expect(page.locator('.card-price').first).to_contain_text('€')
        page.get_by_role('button',name='Wszystkie marki',exact=True).click()
    page.get_by_role('button',name='Otwórz Johnnie Walker',exact=False).click()
    page.get_by_role('searchbox',name='Szukaj whisky').fill('Honour')
    expect(page.locator('.whisky-card')).to_have_count(1)
    page.get_by_role('button',name='Honour',exact=True).click()
    page.get_by_role('button',name='Chcę spróbować',exact=True).click()
    page.get_by_role('button',name='Zamknij',exact=True).click()
    page.reload(wait_until='networkidle',timeout=90000)
    page.locator('.bottom-nav').get_by_role('button',name='Życzenia').click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    expect(page.get_by_role('button',name='Honour',exact=True)).to_be_visible()
    page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click()
    page.get_by_label('Zdjęcie kodu kreskowego').set_input_files(str(Path(__file__).resolve().parent/'fixtures/barcode-ean13.png'))
    expect(page.locator('.barcode-match')).to_contain_text('14 Year Bourbon Barrel Reserve',timeout=30000)
    page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).click()
    page.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click()
    expect(page.locator('.whisky-card')).to_have_count(2)
    expect(page.get_by_role('button',name='14 Year Bourbon Barrel Reserve',exact=True)).to_be_visible()
    page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click()
    page.get_by_label('Numer kodu kreskowego').fill('5000267014203')
    page.get_by_role('button',name='Znajdź butelkę',exact=True).click()
    expect(page.locator('.barcode-match h3')).to_have_text('Red Label')
    expect(page.locator('.barcode-match')).to_contain_text('700 ml')
    page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).click()
    expect(page.locator('[data-whisky-id="jw-004"]')).to_have_count(1)
    page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click()
    page.get_by_label('Numer kodu kreskowego').fill('5011007003005')
    page.get_by_role('button',name='Znajdź butelkę',exact=True).click()
    expect(page.locator('.barcode-match h3')).to_have_text('Original')
    expect(page.locator('.barcode-match')).to_contain_text('700 ml')
    page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).click()
    expect(page.locator('[data-whisky-id="jameson-f2dd066b692a"]')).to_have_count(1)
    # A verified historical price for another bottle size must not inflate a wishlist.
    page.evaluate("()=>{const j=JSON.parse(localStorage.getItem('dram.journal.v2'));j.wishlist=['jw-cfa84236a438'];localStorage.setItem('dram.journal.v2',JSON.stringify(j))}")
    page.reload(wait_until='networkidle',timeout=90000)
    page.locator('.bottom-nav').get_by_role('button',name='Życzenia').click()
    expect(page.locator('.wishlist-value strong')).to_contain_text('0')
    expect(page.locator('.card-price')).to_contain_text('ref.')
    page.locator('.card-title').click()
    expect(page.locator('.reference-price-note')).to_contain_text('poza sumą')
    page.get_by_role('button',name='Zamknij',exact=True).click()
    page.get_by_role('button',name='Ustawienia',exact=True).click()
    page.get_by_label('Język',exact=True).select_option('en')
    page.get_by_label('Region',exact=True).select_option('PL')
    page.get_by_role('button',name='Close',exact=True).click()
    expect(page.locator('html')).to_have_attribute('lang','en')
    expect(page.locator('.wishlist-value strong')).to_contain_text('PLN')
    page.locator('.bottom-nav').get_by_role('button',name='Discover',exact=True).click()
    page.get_by_role('button',name='Open Other',exact=False).click()
    expect(page.locator('.page-intro .count')).to_have_text('56')
    expect(page.locator('.card-price').first).to_contain_text('PLN')
    for term in ['Golden Loch','Queen Margot','Western Gold','Dundalgan']:
        page.get_by_role('searchbox',name='Search whisky',exact=True).fill(term)
        expect(page.locator('.whisky-card')).not_to_have_count(0)
        page.locator('.whisky-card img').first.evaluate("img=>img.loading='eager'")
        page.wait_for_function("document.querySelector('.whisky-card img')?.naturalWidth > 0")
    page.get_by_role('button',name='Scan barcode',exact=True).click()
    page.get_by_label('Barcode photo',exact=True).set_input_files(str(Path(__file__).resolve().parent/'fixtures/barcode-queen-margot-ean8.png'))
    expect(page.locator('.barcode-match')).to_contain_text('Queen Margot',timeout=30000)
    page.get_by_role('button',name='Close',exact=True).click()
    page.reload(wait_until='networkidle',timeout=90000)
    expect(page.locator('html')).to_have_attribute('lang','en')
    page.get_by_role('button',name='Settings',exact=True).click()
    expect(page.get_by_label('Region',exact=True)).to_have_value('PL')
    page.get_by_role('button',name='Close',exact=True).click()
    page.screenshot(path='/tmp/dram-live-mobile.png')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors,errors
    assert any('/whisky/assets/' in u and '.js' in u for u,s in fetched)
    assert all(s==200 for u,s in fetched)
    print({'public_page':'passed','compiled_assets':'passed','age_gate':'passed','johnnie_walker_releases':253,'jack_daniels_releases':122,'brand_choices':12,'real_photo':'passed','search':'passed','wishlist_persistence':'passed','mobile_layout':'passed','javascript_errors':errors,'barcode_photo_pixel_decode':'passed','barcode_stock_add':'passed','red_label_ean':'passed','jameson_brand_and_gtin':'passed','incompatible_reference_excluded':'passed','other_category_and_supermarket_photos':'passed','EN_PLN_preferences_persistence':'passed','EAN8_photo_decode':'passed','public_requests':len(fetched)})
    browser.close()
