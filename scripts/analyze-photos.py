"""Measure original photos for CSS framing/background matching. Never writes image pixels.
Requires Pillow; run when catalog photos change. Output is presentation metadata only.
"""
import json, statistics
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
result={}
recorded=json.loads((ROOT/'src/photo-layout.json').read_text())
manual=json.loads((ROOT/'data/photo-framing.json').read_text())
for w in json.loads((ROOT/'src/catalog.json').read_text()):
 if w['image'].startswith('https://'):
  # Source links use recorded dimensions; never download or republish photos implicitly.
  source=next(record for record in json.loads((ROOT/'data/catalog-sources.json').read_text()) if record['id']==w['id'])
  result[w['id']]=recorded.get(w['id'],{'inset':'inset(0% 0% 0% 0%)','background':'#fff','ratio':round(source['width']/source['height'],5)})
  continue
 im=Image.open(ROOT/'public'/w['image'].lstrip('/')).convert('RGBA')
 original_width,original_height=im.size
 # The reduced copy is used only for measurements; the downloaded original remains untouched.
 im.thumbnail((128,128));width,height=im.size;pts=[]
 for y in range(height):
  for x in range(width):
   r,g,b,a=im.getpixel((x,y))
   if a>100 and (min(r,g,b)<175 or (max(r,g,b)-min(r,g,b)>36 and min(r,g,b)<230)):pts.append((x,y))
 if not pts:continue
 left=max(0,min(x for x,y in pts)-6);right=min(width,max(x for x,y in pts)+7);top=max(0,min(y for x,y in pts)-5);bottom=min(height,max(y for x,y in pts)+6)
 custom=manual.get(w['id'],{})
 if custom and custom.get('sourceSize') != [original_width,original_height]:raise ValueError('Review manual photo framing after changing the source image: '+w['id'])
 if 'rect' in custom:
  a,b,c,d=custom['rect'];left=a/original_width*width;top=b/original_height*height;right=c/original_width*width;bottom=d/original_height*height
 # Very small silhouettes get additional clear space, with no cropping of labels or packaging.
 def patch(x,y):
  values=[im.getpixel((xx,yy)) for xx in range(max(0,round(x)-2),min(width,round(x)+3)) for yy in range(max(0,round(y)-2),min(height,round(y)+3))]
  values=[p for p in values if p[3]>240 and min(p[:3])>205 and max(p[:3])-min(p[:3])<30]
  if not values:return (255,255,255)
  return tuple(round(statistics.median(p[c] for p in values)) for c in range(3))
 lt=patch(left,top);rt=patch(right-1,top);lb=patch(left,bottom-1);rb=patch(right-1,bottom-1)
 L=tuple(round((a+b)/2) for a,b in zip(lt,lb));R=tuple(round((a+b)/2) for a,b in zip(rt,rb))
 color=lambda c:'rgb('+','.join(map(str,c))+')'
 gradient='linear-gradient(105deg,'+color(L)+','+color(R)+')'
 inset=f'inset({top/height*100:.2f}% {(width-right)/width*100:.2f}% {(height-bottom)/height*100:.2f}% {left/width*100:.2f}%)'
 result[w['id']]={'inset':inset,'background':gradient,'ratio':round((right-left)/(bottom-top),5)}
 if 'rotationDeg' in custom:result[w['id']]['rotationDeg']=custom['rotationDeg']
 if 'polygon' in custom:
  result[w['id']]['clipPath']='polygon('+','.join(f'{(x/original_width*width-left)/(right-left)*100:.3f}% {(y/original_height*height-top)/(bottom-top)*100:.3f}%' for x,y in custom['polygon'])+')'
  result[w['id']]['background']='#fff'
(ROOT/'src/photo-layout.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Measured',len(result),'original photos; image files unchanged.')
