"""A real, stoppable HTTP origin: offline navigation must work without any server."""
import atexit,threading,urllib.parse
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
class OfflineOrigin:
    def __init__(self,root):
        root=Path(root).resolve()
        class Handler(SimpleHTTPRequestHandler):
            def log_message(self,*args):pass
            def translate_path(self,url):
                path=urllib.parse.unquote(urllib.parse.urlsplit(url).path).removeprefix('/whisky/')
                target=(root/(path or 'index.html')).resolve()
                return str(target if target.is_relative_to(root)else root/'missing')
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.url=f'http://127.0.0.1:{self.server.server_port}/whisky/'
        self.stopped=False
        threading.Thread(target=self.server.serve_forever,daemon=True).start()
        atexit.register(self.stop)
    def stop(self):
        if self.stopped:return
        self.stopped=True;self.server.shutdown();self.server.server_close()
