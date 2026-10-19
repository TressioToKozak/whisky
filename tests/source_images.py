import os
"""Verified HTTPS transport for source-linked images in the cloud browser's CA environment."""
import hashlib,json,urllib.request,urllib.error,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CAT=json.loads((ROOT/'src/catalog.json').read_text());SOURCES=json.loads((ROOT/'data/catalog-sources.json').read_text());RECORDS={w['image']:next(s for s in SOURCES if s['id']==w['id']) for w in CAT if w['image'].startswith('https://') and not w.get('custom')}
CACHE=Path('/tmp/dram-source-image-cache');CACHE.mkdir(exist_ok=True)
def source_image(url,refresh=False):
 if os.environ.get('DRAM_OFFLINE_IMAGES')=='1':
  return (ROOT/'public'/next(w['image'].lstrip('/') for w in CAT if w['id']=='jw-001')).read_bytes(),'image/jpeg'
 record=RECORDS[url];path=CACHE/record['sha256']
 if refresh or not path.exists():
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35)as response:
   data=response.read();assert response.status==200
  assert hashlib.sha256(data).hexdigest()==record['sha256'],url
  path.write_bytes(data)
 data=path.read_bytes();assert hashlib.sha256(data).hexdigest()==record['sha256'],url
 mime='image/png'if data.startswith(b'\x89PNG')else'image/webp'if data[8:12]==b'WEBP'else'image/jpeg'
 return data,mime
def install_source_images(target):
 def handler(route):
  url=route.request.url
  if '/images/stencil/' in url:
   import re
   original=re.sub(r'/stencil/(?:320|640)w/','/stencil/1024w/',url)
   if original in RECORDS:url=original
  if url not in RECORDS:route.continue_();return
  data,mime=source_image(url);route.fulfill(status=200,body=data,content_type=mime)
 for host in {'https://'+url.split('/')[2]+'/**'for url in RECORDS}:target.route(host,handler)
