"""Optional live audit; never edits catalogue/photos. Standard library, verified TLS."""
import argparse, concurrent.futures, hashlib, json, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--report',default='/tmp/dram-external-photos.json');args=p.parse_args()
cat=json.loads((ROOT/'src/catalog.json').read_text());sources={s['id']:s for s in json.loads((ROOT/'data/catalog-sources.json').read_text())}
jobs=[]
for w in cat:
 if not w['image'].startswith('https://'):continue
 jobs.append((w['id'],w['image'],sources[w['id']]['sha256']))
 if 'cdn11.bigcommerce.com/' in w['image'] and '/1024w/' in w['image']:
  for width in [320,640]:jobs.append((w['id'],w['image'].replace('/1024w/',f'/{width}w/'),None))
def check(job):
 id,url,expected=job;row={'id':id,'url':url}
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Dram photo availability audit','Referer':'https://tressiotokozak.github.io/whisky/'}),timeout=35)as r:
   body=r.read(20*1024*1024+1);mime=r.headers.get('Content-Type','').split(';')[0]
   if len(body)>20*1024*1024:raise ValueError('Image exceeds audit size limit')
   if not mime.startswith('image/'):raise ValueError(f'Unexpected content type: {mime}')
   digest=hashlib.sha256(body).hexdigest();row.update(status=r.status,bytes=len(body),contentType=mime,sha256=digest,sourceChanged=bool(expected and digest!=expected),ok=True)
 except Exception as e:row.update(ok=False,error=str(e))
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:results=list(pool.map(check,jobs))
report={'images':len(results),'errors':sum(not r['ok']for r in results),'changedOriginals':sum(r.get('sourceChanged',False)for r in results),'results':results}
Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k!='results'}));print(f'Report: {args.report}')
raise SystemExit(1 if report['errors'] else 0)
