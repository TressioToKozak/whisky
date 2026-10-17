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
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until='networkidle',timeout=90000)
    expect(page.get_by_role('heading',name='Masz ukończone 18 lat?')).to_be_visible()
    page.get_by_role('button',name='Tak, mam 18 lat').click()
    expect(page.get_by_role('heading',name='Johnnie Walker',exact=False)).to_be_visible()
    expect(page.locator('.whisky-card')).to_have_count(24)
    expect(page.locator('.page-intro .count')).to_have_text(str(len(json.loads((Path(__file__).resolve().parents[1]/'src/catalog.json').read_text()))))
    photo=page.locator('.whisky-card img').first
    expect(photo).to_be_visible()
    assert photo.evaluate('(img)=>img.complete && img.naturalWidth>0')
    page.get_by_role('searchbox',name='Szukaj whisky').fill('Honour')
    expect(page.locator('.whisky-card')).to_have_count(1)
    page.get_by_role('button',name='Dodaj do życzeń: Honour',exact=True).click()
    page.reload(wait_until='networkidle',timeout=90000)
    page.locator('.bottom-nav').get_by_role('button',name='Życzenia').click()
    expect(page.locator('.whisky-card')).to_have_count(1)
    expect(page.get_by_role('button',name='Honour',exact=True)).to_be_visible()
    page.screenshot(path='/tmp/dram-live-mobile.png')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors,errors
    assert any('/whisky/assets/' in u and '.js' in u for u,s in fetched)
    assert all(s==200 for u,s in fetched)
    print({'public_page':'passed','compiled_assets':'passed','age_gate':'passed','catalog_count':253,'real_photo':'passed','search':'passed','wishlist_persistence':'passed','mobile_layout':'passed','javascript_errors':errors,'public_requests':len(fetched)})
    browser.close()
