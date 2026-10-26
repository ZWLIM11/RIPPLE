"""Loopback-only review server. Serves only tool assets and the selected clip."""
import argparse, hashlib, json, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def byte_range(value,size):
    if not value:return 0,size-1,False
    match=re.fullmatch(r'bytes=(\d*)-(\d*)',value)
    if not match or not any(match.groups()):raise ValueError('invalid range')
    a,b=match.groups()
    start=int(a) if a else max(0,size-int(b))
    end=min(int(b),size-1) if a and b else size-1
    if start>=size or end<start:raise ValueError('unsatisfiable')
    return start,end,True

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--clip',required=True);parser.add_argument('--port',type=int,default=8798);args=parser.parse_args()
    clip=Path(args.clip).resolve()
    if not clip.is_file():raise SystemExit('Clip not found')
    digest=hashlib.sha256(clip.read_bytes()).hexdigest()
    expected='f0dfbef3b496867bd2a1261c9a4d4c538d3861bf15b50109e9287c6a1371fc04'
    if digest!=expected:raise SystemExit('This pilot requires the verified 118577 clip')
    config={'clip':'118577','sha256':digest,'fps':25,'duration':240,'windows':[{'start':n,'end':n+20} for n in range(0,240,20)],'source_url':'https://huggingface.co/datasets/atomscott/soccertrack-v2/blob/main/mot/clips/118577.mp4'}
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path=self.path.split('?')[0]
            if path=='/config.json':
                data=json.dumps(config).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            assets={'/':('index.html','text/html; charset=utf-8'),'/review.js':('review.js','text/javascript; charset=utf-8')}
            if path in assets:
                name,mime=assets[path];data=(ROOT/name).read_bytes();self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            if path!='/clip.mp4':self.send_error(404);return
            size=clip.stat().st_size
            try:start,end,partial=byte_range(self.headers.get('Range'),size)
            except ValueError:self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return
            self.send_response(206 if partial else 200);self.send_header('Content-Type','video/mp4');self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
            if partial:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
            self.end_headers()
            try:
                with clip.open('rb') as f:
                    f.seek(start);remaining=end-start+1
                    while remaining:
                        block=f.read(min(262144,remaining))
                        if not block:break
                        self.wfile.write(block);remaining-=len(block)
            except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
    print(f'Review tool: http://127.0.0.1:{args.port}/ — verified {clip.name}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
if __name__=='__main__':main()
