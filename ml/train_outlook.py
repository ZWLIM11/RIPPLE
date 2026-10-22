"""Fixed research experiment on pinned StatsBomb events, never app promotion.

Usage: python ml/train_outlook.py --cache ../PassDetective/work/statsbomb
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import numpy as np
import pandas as pd
import joblib
from catboost import CatBoostClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from train import metrics, calibrator, bootstrap_difference, SEED
from download import REVISION, ROOT

FEATURES=['x','y','distance','angle','pressure','header']

def geometry(location,pressure=False,header=False):
    x,y=location[:2];x=x*105/120;y=y*68/80
    if not 0<=x<=105 or not 0<=y<=68:raise ValueError('Invalid location')
    dx=105-x
    return [x,y,float(np.hypot(dx,34-y)),float(abs(np.arctan2(7.32*dx,dx*dx+(30.34-y)*(37.66-y)))),int(pressure),int(header)]

def clock(e):return e['minute']*60+e['second']

def extract(events,mid,year):
    shots=[];creation=[]
    for i,e in enumerate(events):
        if e.get('period',0)>2 or not e.get('location'):continue
        kind=e.get('type',{}).get('name')
        if kind=='Shot' and e['shot'].get('type',{}).get('name')=='Open Play':
            body=e['shot'].get('body_part',{}).get('name')
            if body not in ['Left Foot','Right Foot','Head']:continue
            shots.append(dict(zip(FEATURES,geometry(e['location'],e.get('under_pressure',False),body=='Head')),label=int(e['shot']['outcome']['name']=='Goal'),match_id=mid,year=year))
        if kind=='Pass':
            p=e['pass']
            if p.get('outcome') or p.get('type') or p.get('height',{}).get('name')!='Ground Pass' or not p.get('end_location'):continue
            # Conditional on completion. A future shot is a LABEL only.
            label=0
            for f in events[i+1:]:
                if f.get('period')!=e['period'] or f.get('possession')!=e.get('possession') or clock(f)-clock(e)>10:break
                if f.get('type',{}).get('name')=='Shot' and f.get('team',{}).get('id')==e['team']['id']:label=1;break
            creation.append(dict(zip(FEATURES[:4],geometry(p['end_location'])[:4]),label=label,match_id=mid,year=year))
    return shots,creation

def fit(frame,features,partitions,name,out):
    parts={k:frame[frame.match_id.isin(v)] for k,v in partitions.items()}
    train,cal,test=[parts[k] for k in ['train','calibration','test']]
    cb=CatBoostClassifier(iterations=300,depth=4,learning_rate=.03,random_seed=SEED,thread_count=4,verbose=False,allow_writing_files=False)
    lr=make_pipeline(StandardScaler(),LogisticRegression(max_iter=2000))
    cb.fit(train[features],train.label);lr.fit(train[features],train.label)
    cbc=calibrator(cb.predict(cal[features],prediction_type='RawFormulaVal'),cal.label)
    lrc=calibrator(lr.decision_function(cal[features]),cal.label)
    cp=cbc.predict_proba(np.asarray(cb.predict(test[features],prediction_type='RawFormulaVal')).reshape(-1,1))[:,1]
    lp=lrc.predict_proba(lr.decision_function(test[features]).reshape(-1,1))[:,1]
    scores={'catboost':metrics(test.label,cp),'logistic':metrics(test.label,lp),'constant':metrics(test.label,np.full(len(test),train.label.mean()))}
    ci=bootstrap_difference(test,cp,lp)
    checks={'logloss_gain_2_percent':scores['catboost']['log_loss']<=.98*scores['logistic']['log_loss'],
            'brier_better':scores['catboost']['brier']<scores['logistic']['brier'],'ece_under_005':scores['catboost']['ece']<=.05,'match_bootstrap_better':ci[1]<0}
    cb.save_model(str(out/f'{name}.cbm'));joblib.dump({'calibrator':cbc,'logistic':lr,'logistic_calibrator':lrc,'features':features},out/f'{name}.joblib')
    return {'features':features,'partitions':{k:{'rows':len(v),'positives':int(v.label.sum()),'matches':int(v.match_id.nunique())} for k,v in parts.items()},'metrics':scores,'logloss_difference_match_bootstrap_95':ci,'checks':checks,'statistical_screen_passed':all(checks.values()),'production_approved':False}

def goals(events,home,away):
    out=[]
    for e in events:
        if e.get('period',0)>2:continue
        typ=e.get('type',{}).get('name');team=e.get('team',{}).get('id')
        if typ=='Shot' and e.get('shot',{}).get('outcome',{}).get('name')=='Goal':out.append((clock(e),team))
        elif typ=='Own Goal Against':out.append((clock(e),away if team==home else home))
    return out

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache',type=Path,required=True);args=parser.parse_args()
    manifest=json.loads((args.cache/'manifest.json').read_text());assert manifest['revision']==REVISION
    for f in manifest['files']:
        if hashlib.sha256((args.cache/f['path']).read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Cache hash mismatch')
    matches=[];shotrows=[];creationrows=[];hist=[]
    for year,season in [(2018,3),(2022,106)]:
        for m in json.loads((args.cache/f'data/matches/43/{season}.json').read_text(encoding='utf-8')):
            mid=m['match_id'];matches.append((mid,year));events=json.loads((args.cache/f'data/events/{mid}.json').read_text(encoding='utf-8'))
            shots,creation=extract(events,mid,year);shotrows+=shots;creationrows+=creation
            home=m['home_team']['home_team_id'];away=m['away_team']['away_team_id'];g=goals(events,home,away)
            hist.append({'match':mid,'year':year,'home':home,'away':away,'goals':g})
    ids=sorted(mid for mid,y in matches if y==2018);np.random.default_rng(SEED).shuffle(ids)
    partitions={'train':ids[:48],'calibration':ids[48:],'test':sorted(mid for mid,y in matches if y==2022)}
    out=ROOT/'ml/artifacts/outlook';out.mkdir(parents=True,exist_ok=True)
    report={'source':'StatsBomb Open Data','revision':REVISION,'seed':SEED,'partitions':partitions,'production_approved':False}
    for name,rows,features in [('shot_scoring',shotrows,FEATURES),('shot_creation',creationrows,FEATURES[:4])]:
        print('Training',name,len(rows),flush=True);report[name]=fit(pd.DataFrame(rows),features,partitions,name,out)
    training=[m for m in hist if m['match'] in partitions['train']]
    hr=sum(sum(t==m['home'] for _,t in m['goals']) for m in training)/len(training)
    ar=sum(sum(t==m['away'] for _,t in m['goals']) for m in training)/len(training)
    samples=[];labels=[]
    for m in hist:
        if m['year']!=2022:continue
        final=sum(t==m['home'] for _,t in m['goals'])-sum(t==m['away'] for _,t in m['goals'])
        for minute in [0,30,60,75,85]:
            samples.append({'homeScore':sum(t==m['home'] and sec<minute*60 for sec,t in m['goals']),'awayScore':sum(t==m['away'] and sec<minute*60 for sec,t in m['goals']),'minute':minute,'stoppage':0,'homeRate':hr,'awayRate':ar,'side':'home'})
            labels.append(0 if final>0 else 1 if final==0 else 2)
    script="const fs=require('fs'),vm=require('vm');const M=vm.runInNewContext(fs.readFileSync('prototypes/pass-detective/outcome-model.js','utf8')+'\\nOutcomeModel');console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(s=>{const o=M.outcome(s);return [o.win,o.draw,o.loss]})))"
    predictions=np.array(json.loads(subprocess.check_output(['node','-e',script],input=json.dumps(samples),text=True,cwd=ROOT)))
    y=np.eye(3)[labels];bins={}
    train_labels=[]
    for m in training:
        d=sum(t==m['home'] for _,t in m['goals'])-sum(t==m['away'] for _,t in m['goals'])
        train_labels.append(0 if d>0 else 1 if d==0 else 2)
    constant=np.bincount(train_labels,minlength=3)/len(training)
    for i,minute in enumerate([0,30,60,75,85]):
        p=predictions[i::5];target=y[i::5]
        reliability={}
        for c,name in enumerate(['win','draw','loss']):
            reliability[name]=[]
            for lo in np.arange(0,1,.1):
                mask=(p[:,c]>=lo)&(p[:,c]<lo+.1)
                if mask.any():reliability[name].append({'lower':round(float(lo),1),'count':int(mask.sum()),'predicted':float(p[mask,c].mean()),'observed':float(target[mask,c].mean())})
        bins[str(minute)]={'matches':len(p),'multiclass_brier_sum':float(np.mean(np.sum((p-target)**2,axis=1))),'log_loss':float(-np.log(np.clip(p[np.arange(len(p)),np.array(labels)[i::5]],1e-12,1)).mean()),'training_outcome_frequency_brier':float(np.mean(np.sum((constant-target)**2,axis=1))),'reliability_bins':reliability}
    report['match_outlook']={'home_rate_from_train':hr,'away_rate_from_train':ar,'test_matches':64,'per_minute':bins,'production_calibrated':False,'limitations':'Neutral-tournament home designation; rates not team-strength specific. Snapshot minute uses provider clock, regulation outcomes include stoppage; baseline sets added time to zero. Extra time and shootouts excluded. Repeated snapshots are not independent matches.'}
    report['limitations']=['2022 was used in earlier pass research; untouched for this fixed experiment, not an entirely new project holdout.','Shot scoring uses actual pre-shot pressure/body part, unavailable from screenshot geometry alone.','Shot creation is conditional on observed completed ground passes and uses recorded endpoint; not failed-pass intent or alternative-action causal value.','No joint possession/counter model or counterfactual WPA validation. No screenshot promotion.']
    (ROOT/'ml/outlook-evaluation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v.get('checks') for k,v in report.items() if isinstance(v,dict) and 'checks' in v}),flush=True)

if __name__=='__main__':main()
