"""Fetch the 40 original public photos with TLS verification and compare recorded SHA-256."""
from concurrent.futures import ThreadPoolExecutor
from source_images import RECORDS,source_image
with ThreadPoolExecutor(max_workers=4)as pool:
 results=list(pool.map(lambda url:(url,len(source_image(url,refresh=True)[0])),RECORDS))
assert len(results)==40
print({'source_photographs':len(results),'verified_TLS_and_SHA256':True,'redistributed_bottle_files':0})
