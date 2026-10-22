"""Development-only possession proxy. No target endpoint or pass result features."""
import json,hashlib
import numpy as np
import pandas as pd
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from audit_transitions import audit
from train import metrics,calibrator,bootstrap_difference
from download import ROOT,REVISION

cache=ROOT.parent/'PassDetective/work/statsbomb'
manifest=json.loads((cache/'manifest.json').read_text());assert manifest['revision']==REVISION
for f in manifest['files']:assert hashlib.sha256((cache/f['path']).read_bytes()).hexdigest()==f['sha256']
old=json.loads((ROOT/'ml/outlook-evaluation.json').read_text());rows=[];excluded=0
for year,season in [(2018,3),(2022,106)]:
 for m in json.loads((cache/f'data/matches/43/{season}.json').read_text(encoding='utf-8')):
  events=json.loads((cache/f"data/events/{m['match_id']}.json").read_text(encoding='utf-8'))
  records,_=audit(events,m['home_team']['home_team_id'],m['away_team']['away_team_id'])
  for r in records:
   if r['kind']!='pass':continue
   if not r['origin'] or r['last_recorded_possession']=='unknown':excluded+=1;continue
   x,y=r['origin'][:2]
   rows.append(dict(x=x/120,y=y/80,pressure=int(r['pressure']),minute=r['minute']/90,label=int(r['last_recorded_possession']=='own'),match_id=m['match_id']))
frame=pd.DataFrame(rows);features=['x','y','pressure','minute'];parts={k:frame[frame.match_id.isin(v)] for k,v in old['partitions'].items()}
train,cal,test=[parts[k] for k in ['train','calibration','test']]
model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=2000)).fit(train[features],train.label)
calibration=calibrator(model.decision_function(cal[features]),cal.label)
p=calibration.predict_proba(model.decision_function(test[features]).reshape(-1,1))[:,1];constant=np.full(len(test),train.label.mean())
report={'target':'Last recorded possession annotation within 15 seconds belongs to acting team; not continuous control at horizon','features':features,'partitions':{k:{'rows':len(v),'matches':int(v.match_id.nunique()),'positive':int(v.label.sum())} for k,v in parts.items()},'excluded_missing_origin_or_unknown_possession':excluded,'logistic':metrics(test.label,p),'training_constant':metrics(test.label,constant),'logloss_difference_match_bootstrap_95':bootstrap_difference(test,p,constant),'production_approved':False,'limitations':['2022 is reused development evaluation, not untouched external validation.','No intended target input: cannot rank alternative receivers.','Last provider possession can be stale across stoppages.','Goal and possession branches are not jointly modelled; this is not WPA.','No screenshot features or accuracy validation.']}
(ROOT/'ml/possession-baseline.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
