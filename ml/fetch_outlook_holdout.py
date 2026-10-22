"""Fetch only Euro 2024 event JSON; no video, training or model changes."""
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,urllib.request
from pathlib import Path
from download import REVISION,ROOT
cache=ROOT/'work/euro2024';cache.mkdir(exist_ok=True)
base=f'https://raw.githubusercontent.com/statsbomb/open-data/{REVISION}/'
def fetch(path):
    dest=cache/path;dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists():
        with urllib.request.urlopen(base+path,timeout=90) as response: dest.write_bytes(response.read())
    raw=dest.read_bytes();json.loads(raw)
    return {'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
first=fetch('data/matches/55/282.json')
matches=json.loads((cache/first['path']).read_text(encoding='utf-8'))
with ThreadPoolExecutor(max_workers=4) as pool:
    files=[first]+list(pool.map(fetch,[f"data/events/{m['match_id']}.json" for m in matches]))
(cache/'manifest.json').write_text(json.dumps({'revision':REVISION,'files':files},indent=2))
print(json.dumps({'matches':len(matches),'bytes':sum(f['bytes'] for f in files)}))
