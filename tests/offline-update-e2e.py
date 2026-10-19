"""Serve two real service worker revisions; activation is explicit and vetoed by another editor."""
import os,threading,urllib.parse
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
from source_images import install_source_images
ROOT=Path(__file__).resolve().parents[1];revision=1
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def translate_path(self,path):
  name=urllib.parse.urlsplit(path).path.removeprefix('/whisky/');return str(ROOT/'dist'/('index.html'if not name else name))
 def do_GET(self):
  if urllib.parse.urlsplit(self.path).path=='/whisky/sw.js':
   data=(ROOT/'dist/sw.js').read_bytes()+f'\n// integration revision {revision}\n'.encode();self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/whisky/'
try:
 with sync_playwright()as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':900});install_source_images(ctx);ctx.add_init_script('if(!localStorage.getItem("dram.journal.v3")){localStorage.setItem("dram.age","yes");localStorage.setItem("dram.journal.v3",JSON.stringify({version:2,custom:[],reviews:[],wishlist:[],bottles:[{whiskyId:"jw-001",quantity:2,openedCount:1}]}))}');a=ctx.new_page();a.goto(BASE,wait_until='networkidle');a.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration())?.active');a.reload(wait_until='networkidle');a.wait_for_function('!!navigator.serviceWorker.controller');b=ctx.new_page();b.goto(BASE,wait_until='networkidle');b.locator('.bottom-nav').get_by_role('button',name='Barek',exact=True).click();b.get_by_role('button',name='Zarządzaj egzemplarzami',exact=True).click();b.locator('.instance-open').first.click();b.get_by_label('Prywatne notatki egzemplarza',exact=True).fill('Niezapisana notatka podczas aktualizacji');b.evaluate('window.draftSurvived=true')
  revision=2;a.evaluate('async()=>(await navigator.serviceWorker.getRegistration()).update()');button=a.get_by_role('button',name='Zapisz pracę i zaktualizuj',exact=True);expect(button).to_be_visible();button.click();expect(a.locator('.offline-status')).to_contain_text('we wszystkich kartach');assert a.evaluate('async()=>(await navigator.serviceWorker.getRegistration()).waiting.state')=='installed';expect(b.get_by_label('Prywatne notatki egzemplarza',exact=True)).to_have_value('Niezapisana notatka podczas aktualizacji')
  b.get_by_role('dialog',name='Szczegóły egzemplarza',exact=True).get_by_role('button',name='Zamknij',exact=True).click();b.get_by_role('dialog',name='Egzemplarze w kolekcji',exact=True).get_by_role('button',name='Zamknij',exact=True).click()
  with a.expect_navigation(wait_until='networkidle'):button.click()
  expect(a.get_by_role('heading',name='Twoja kolekcja whisky.',exact=True)).to_be_visible();expect(a.locator('.dashboard-stats button').first.locator('strong')).to_have_text('2');assert b.evaluate('window.draftSurvived')is True;assert a.evaluate('async()=>!(await navigator.serviceWorker.getRegistration()).waiting')
  print({'explicit_update':True,'second_tab_editor_veto':True,'unsaved_draft_preserved':True,'safe_controller_reload':True,'no_other_tab_reload':True,'collection_preserved':True});browser.close()
finally:server.shutdown();server.server_close()
