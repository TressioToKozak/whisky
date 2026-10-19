import {createHash}from'node:crypto'
import {readdirSync,readFileSync,writeFileSync}from'node:fs'
import {join}from'node:path'
/** Cache only the compiled app, fonts and brand marks; never the bottle catalogue's images. */
export default function offlinePlugin(){return{name:'dram-offline-shell',closeBundle(){
 const root='dist',base='/whisky/'
 const walk=(dir:string):string[]=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}${e.name}/`):[`${dir}${e.name}`])
 const files=walk('').filter(file=>file==='index.html'||file==='manifest.webmanifest'||file.startsWith('assets/')&&!file.endsWith('.woff')||file.startsWith('brands/')||file.startsWith('icons/'))
 const version=createHash('sha256').update(files.map(f=>createHash('sha256').update(readFileSync(join(root,f))).digest('hex')).join('')).digest('hex').slice(0,16)
 const urls=files.map(f=>base+f)
 writeFileSync(join(root,'sw.js'),`const CACHE='dram-shell-${version}',URLS=${JSON.stringify(urls)},BASE=${JSON.stringify(base)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();if(event.data?.type==='PRUNE_OLD_CACHES'&&Array.isArray(event.data.assets)&&event.data.assets.length>=2&&event.data.assets.every(path=>URLS.includes(path)))event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>clients.length===1&&clients[0].id===event.source?.id?caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dram-shell-')&&k!==CACHE).map(k=>caches.delete(k)))):undefined))});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(cache=>cache.match(BASE+'index.html')).then(cached=>cached||fetch(request)));return;}
 if(URLS.includes(url.pathname)){event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(request)));return;}
 if(url.pathname.startsWith(BASE+'assets/'))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});`)
}}}
