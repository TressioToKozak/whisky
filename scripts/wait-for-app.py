"""Bounded readiness check used by CI before browser tests."""
import os,time,urllib.request
url=os.environ.get('DRAM_URL','http://127.0.0.1:4173/whisky/')
for attempt in range(60):
 try:
  with urllib.request.urlopen(url,timeout=2)as response:
   if response.status==200:break
 except Exception:pass
 time.sleep(0.5)
else:raise SystemExit('Application did not become ready')
print('Application ready')
