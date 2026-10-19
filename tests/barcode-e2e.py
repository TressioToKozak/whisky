from source_images import install_source_images
"""Real ZXing pixel decoding from photo/video; no decoder stubs or external lookup API."""
import base64,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('DRAM_URL','http://127.0.0.1:5173/whisky/')
root=Path(__file__).resolve().parents[1];fixture=root/'tests/fixtures/barcode-ean13.png';code='5010327324333';unknown='1234567890128'
entries=json.loads((root/'src/barcodes.json').read_text());target=next(e['whiskyId'] for e in entries if e['code']=='0'+code)
cat=json.loads((root/'src/catalog.json').read_text());whisky=next(w for w in cat if w['id']==target)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});page=ctx.new_page();install_source_images(page);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def journal():return page.evaluate("JSON.parse(localStorage.getItem('dram.journal.v3'))")
 def open_scan():page.get_by_role('button',name='Skanuj kod kreskowy',exact=True).click();expect(page.get_by_role('dialog',name='Skaner kodów kreskowych')).to_be_visible()
 def enter(c):page.get_by_role('textbox',name='Numer kodu kreskowego').fill(c);page.get_by_role('button',name='Znajdź butelkę').click()
 def close():page.get_by_role('button',name='Zamknij',exact=True).click()
 page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='Tak, mam 18 lat').click()
 open_scan();page.screenshot(path='/tmp/dram-barcode-start.png');enter('5010327324334');expect(page.get_by_role('alert')).to_contain_text('cyfrę kontrolną');assert not journal()['bottles']
 enter(code);expect(page.locator('.barcode-match')).to_contain_text(whisky['name']);expect(page.locator('.barcode-match')).to_contain_text('700 ml');assert not journal()['bottles'];close();assert not journal()['bottles']
 # Actual image decoding, preserving old journal fields and adding only on confirmation.
 open_scan();page.get_by_label('Zdjęcie kodu kreskowego').set_input_files({'name':'broken.png','mimeType':'image/png','buffer':b'not an image'});expect(page.get_by_role('alert')).to_contain_text('Nie odczytano kodu');page.get_by_label('Zdjęcie kodu kreskowego').set_input_files(str(fixture));expect(page.locator('.barcode-match')).to_contain_text(whisky['name'],timeout=20000);page.screenshot(path='/tmp/dram-barcode-match.png')
 page.get_by_role('button',name='Dodaj butelkę do barku',exact=True).evaluate('button=>{button.click();button.click()}');expect(page.get_by_role('dialog')).to_have_count(0);assert journal()['bottles'][0]['quantity']==1
 open_scan();enter(code);page.get_by_role('button',name='Dodaj kolejną butelkę',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);assert journal()['bottles'][0]['quantity']==2
 # Unknown codes require explicit matching; personal associations survive reload.
 open_scan();enter(unknown);expect(page.get_by_text('Kod odczytany. Nie mamy jeszcze jego przypisania',exact=False)).to_be_visible();assert journal()['bottles'][0]['quantity']==2
 page.get_by_role('searchbox',name='Dopasuj whisky do kodu').fill('ballantines sweet');expect(page.locator('.barcode-option')).to_have_count(1);page.locator('.barcode-option').click();page.get_by_role('button',name='Dodaj butelkę do barku').click();expect(page.get_by_role('dialog')).to_have_count(0);assert any(link['code']=='0'+unknown for link in journal()['barcodeLinks'])
 page.reload(wait_until='networkidle');open_scan();enter(unknown);expect(page.locator('.barcode-match')).to_contain_text('Sweet Blend');close()
 # Unknown code can become a new personal entry and is removed with that entry.
 customcode='5901234123457';open_scan();enter(customcode);page.get_by_role('dialog',name='Skaner kodów kreskowych').get_by_role('button',name='Dodaj własną whisky').click();expect(page.get_by_role('dialog',name='Dodaj własną whisky')).to_be_visible();page.get_by_role('textbox',name='Marka',exact=True).fill('Moja marka');page.get_by_role('textbox',name='Nazwa / edycja').fill('Test kodu');page.get_by_role('dialog',name='Dodaj własną whisky').get_by_role('button',name='Dodaj whisky',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);custom=journal()['custom'][-1];assert any(link['whiskyId']==custom['id'] for link in journal()['barcodeLinks'])
 page.reload(wait_until='networkidle');open_scan();enter(customcode);expect(page.locator('.barcode-match')).to_contain_text('Test kodu');close()
 page.get_by_role('searchbox',name='Szukaj we wszystkich markach').fill('Test kodu');page.get_by_role('button',name='Test kodu',exact=True).click();page.get_by_role('button',name='Usuń własny wpis',exact=False).click();page.get_by_role('button',name='Potwierdź',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0);assert not any(link['whiskyId']==custom['id'] for link in journal()['barcodeLinks'])
 # A denied camera never blocks manual entry.
 page.evaluate("()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError')}}")
 open_scan();page.get_by_role('button',name='Włącz aparat').click();expect(page.get_by_role('alert')).to_contain_text('Brak dostępu do aparatu');enter(code);expect(page.locator('.barcode-match')).to_contain_text(whisky['name']);close()
 # Real MediaStream video frames from a canvas, not a mocked decoding result.
 data=base64.b64encode(fixture.read_bytes()).decode()
 page.evaluate("""async data=>{
  const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();window.cameraStats={started:0,stopped:0};
  navigator.mediaDevices.getUserMedia=async constraints=>{
   window.cameraStats.started++;window.cameraConstraints=constraints;
   const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const c=canvas.getContext('2d');
   const draw=()=>{c.fillStyle='white';c.fillRect(0,0,1280,720);c.drawImage(img,160,180,960,360)};draw();const timer=setInterval(draw,80);const stream=canvas.captureStream(12);
   for(const track of stream.getTracks()){const original=track.stop.bind(track);track.stop=()=>{window.cameraStats.stopped++;clearInterval(timer);original()}}return stream;
  }
 }""",data)
 open_scan();page.get_by_role('button',name='Włącz aparat').click();expect(page.locator('.barcode-match')).to_contain_text(whisky['name'],timeout=30000);assert page.evaluate('cameraStats.started')==1;assert page.evaluate('cameraStats.stopped')>=1;assert page.evaluate('cameraConstraints.video.facingMode.ideal')=='environment';assert journal()['bottles'][0]['quantity']==2;close()
 # Close and tab-hide stop the stream even before any code has been read.
 page.evaluate("""()=>{navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,640,480);const stream=c.captureStream(10);window.liveTrack=stream.getVideoTracks()[0];return stream}}""")
 open_scan();page.get_by_role('button',name='Włącz aparat').click();page.wait_for_function('window.liveTrack?.readyState==="live"');close();page.wait_for_function('liveTrack.readyState==="ended"')
 open_scan();page.get_by_role('button',name='Włącz aparat').click();page.wait_for_function('window.liveTrack?.readyState==="live"');page.evaluate("()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden}");page.wait_for_function('liveTrack.readyState==="ended"');expect(page.get_by_role('button',name='Włącz aparat')).to_be_visible();close()
 # Camera permission may resolve only after the dialog has already closed.
 page.evaluate("""()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.resolveCamera=()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const stream=c.captureStream(10);window.lateTrack=stream.getVideoTracks()[0];resolve(stream)}})}""")
 open_scan();page.get_by_role('button',name='Włącz aparat').click();page.wait_for_function('typeof window.resolveCamera==="function"');close();page.evaluate('resolveCamera()');page.wait_for_function('lateTrack.readyState==="ended"')
 open_scan()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 close();assert not errors,errors
 print({'manual_checksum':'passed','confirm_before_stock_change':'passed','photo_pixel_decode':'passed','corrupt_photo_recovery':'passed','live_video_pixel_decode':'passed','duplicate_frame_guard':'passed','quantity_increment':'passed','unknown_code_matching':'passed','custom_entry_and_cleanup':'passed','remembered_mapping':'passed','permission_denial':'passed','camera_stop_visibility_and_late_permission':'passed','double_tap_guard':'passed','responsive':'passed','javascript_errors':errors});b.close()
