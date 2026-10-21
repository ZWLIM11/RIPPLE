"""Fetch pinned public SkillCorner data; retain only pass release tracking frames."""
import hashlib
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pandas as pd

SHA='4340d274572876239c154c90bc507a9b3250a656'
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'work/skillcorner'
RAW=f'https://raw.githubusercontent.com/SkillCorner/opendata/{SHA}/'

def fetch(path):
    with urllib.request.urlopen(RAW+path,timeout=120) as r:return r.read()

def match(mid):
    dest=DATA/str(mid);dest.mkdir(exist_ok=True)
    if (dest/'manifest.json').exists():return
    base=f'data/matches/{mid}/{mid}'
    hashes={}
    for suffix,name in [('_dynamic_events.csv','events.csv'),('_match.json','match.json')]:
        blob=fetch(base+suffix);(dest/name).write_bytes(blob)
        hashes[name]=hashlib.sha256(blob).hexdigest()
    events=pd.read_csv(dest/'events.csv',low_memory=False)
    selected=events[(events.event_type=='player_possession')&events.pass_outcome.isin(['successful','unsuccessful','offside'])]
    frames=set(selected.frame_end.dropna().astype(int))
    pointer=fetch(base+'_tracking_extrapolated.jsonl').decode()
    expected=pointer.split('oid sha256:')[1].splitlines()[0]
    url=f'https://media.githubusercontent.com/media/SkillCorner/opendata/{SHA}/{base}_tracking_extrapolated.jsonl'
    h=hashlib.sha256();kept=[]
    with urllib.request.urlopen(url,timeout=180) as response:
        for line in response:
            h.update(line)
            item=json.loads(line)
            if item['frame'] in frames:kept.append(item)
    if h.hexdigest()!=expected:raise ValueError('Tracking source hash mismatch')
    (dest/'release.json').write_text(json.dumps(kept))
    hashes['tracking_original']=expected
    hashes['release.json']=hashlib.sha256((dest/'release.json').read_bytes()).hexdigest()
    (dest/'manifest.json').write_text(json.dumps({'match':mid,'commit':SHA,'hashes':hashes,'release_frames':len(kept)},indent=2))
    print(f'{mid}: {len(selected)} attempts, {len(kept)} release frames',flush=True)

def main():
    DATA.mkdir(parents=True,exist_ok=True)
    with urllib.request.urlopen(f'https://api.github.com/repos/SkillCorner/opendata/git/trees/{SHA}?recursive=1') as r:tree=json.load(r)
    ids=sorted({int(x['path'].split('/')[2]) for x in tree['tree'] if x['path'].endswith('_dynamic_events.csv')})
    (DATA/'LICENSE').write_bytes(fetch('LICENSE'))
    (DATA/'matches.json').write_bytes(fetch('data/matches.json'))
    print('Matches:',ids,flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(match,ids))

if __name__=='__main__':main()
