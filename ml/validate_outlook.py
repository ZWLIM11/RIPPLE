"""Frozen-model external evaluation. Never trains or recalibrates on Euro 2024."""
import hashlib,json,subprocess
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from catboost import CatBoostClassifier
from train_outlook import extract,goals
from train import metrics,bootstrap_difference,SEED
from download import ROOT,REVISION

def mean_ci(values):
    values=np.asarray(values);rng=np.random.default_rng(SEED)
    sampled=values[rng.integers(0,len(values),(2000,len(values)))].mean(axis=1)
    return [float(v) for v in np.quantile(sampled,[.025,.975])]

def main():
    cache=ROOT/'work/euro2024';art=ROOT/'ml/artifacts/outlook'
    old=json.loads((ROOT/'ml/outlook-evaluation.json').read_text())
    manifest=json.loads((cache/'manifest.json').read_text());assert manifest['revision']==REVISION
    for row in manifest['files']:assert hashlib.sha256((cache/row['path']).read_bytes()).hexdigest()==row['sha256']
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(art.glob('*')) if p.suffix in ['.cbm','.joblib']}
    matches=json.loads((cache/'data/matches/55/282.json').read_text(encoding='utf-8'))
    previous=set(sum(old['partitions'].values(),[]));assert not previous.intersection(m['match_id'] for m in matches)
    shots=[];creation=[];samples=[];labels=[]
    for m in matches:
        events=json.loads((cache/f"data/events/{m['match_id']}.json").read_text(encoding='utf-8'))
        a,b=extract(events,m['match_id'],2024);shots+=a;creation+=b
        home=m['home_team']['home_team_id'];away=m['away_team']['away_team_id'];g=goals(events,home,away)
        final=sum(t==home for _,t in g)-sum(t==away for _,t in g)
        for minute in [0,30,60,75,85]:
            samples.append(dict(homeScore=sum(t==home and sec<minute*60 for sec,t in g),awayScore=sum(t==away and sec<minute*60 for sec,t in g),minute=minute,stoppage=0,homeRate=old['match_outlook']['home_rate_from_train'],awayRate=old['match_outlook']['away_rate_from_train'],side='home'))
            labels.append(0 if final>0 else 1 if final==0 else 2)
    report={'source':'StatsBomb Open Data, UEFA Euro 2024','revision':REVISION,'match_ids':[m['match_id'] for m in matches],'model_hashes':hashes,'data_manifest_sha256':hashlib.sha256((cache/'manifest.json').read_bytes()).hexdigest(),'training_or_recalibration_performed':False,'production_approved':False}
    for name,rows in [('shot_scoring',shots),('shot_creation',creation)]:
        frame=pd.DataFrame(rows);bundle=joblib.load(art/f'{name}.joblib');features=bundle['features'];cb=CatBoostClassifier();cb.load_model(str(art/f'{name}.cbm'))
        cp=bundle['calibrator'].predict_proba(np.asarray(cb.predict(frame[features],prediction_type='RawFormulaVal')).reshape(-1,1))[:,1]
        lp=bundle['logistic_calibrator'].predict_proba(bundle['logistic'].decision_function(frame[features]).reshape(-1,1))[:,1]
        train=old[name]['partitions']['train'];constant=np.full(len(frame),train['positives']/train['rows'])
        scores={k:metrics(frame.label,p) for k,p in [('catboost',cp),('logistic',lp),('training_constant',constant)]}
        ci=bootstrap_difference(frame,cp,lp);c,l=scores['catboost'],scores['logistic']
        checks={'logloss_gain_2_percent':c['log_loss']<=.98*l['log_loss'],'brier_better':c['brier']<l['brier'],'ece_under_005':c['ece']<=.05,'match_bootstrap_better':ci[1]<0}
        report[name]={'rows':len(frame),'positives':int(frame.label.sum()),'matches':int(frame.match_id.nunique()),'metrics':scores,'logloss_difference_match_bootstrap_95':ci,'checks':checks,'screen_passed':all(checks.values())}
    script="const fs=require('fs'),vm=require('vm');const M=vm.runInNewContext(fs.readFileSync('prototypes/pass-detective/outcome-model.js','utf8')+'\\nOutcomeModel');console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(s=>{const o=M.outcome(s);return [o.win,o.draw,o.loss]})))"
    predictions=np.array(json.loads(subprocess.check_output(['node','-e',script],input=json.dumps(samples),text=True,cwd=ROOT)))
    y=np.eye(3)[labels];report['match_outlook']={}
    for i,minute in enumerate([0,30,60,75,85]):
        p=predictions[i::5];target=y[i::5];brier=((p-target)**2).sum(axis=1);ll=-np.log(np.clip((p*target).sum(axis=1),1e-12,1))
        # Each row at a single minute is a different match; no snapshot pseudo-replication.
        report['match_outlook'][str(minute)]={'matches':len(p),'brier_sum':float(brier.mean()),'brier_match_bootstrap_95':mean_ci(brier),'log_loss':float(ll.mean()),'logloss_match_bootstrap_95':mean_ci(ll)}
    assert hashes=={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(art.glob('*')) if p.suffix in ['.cbm','.joblib']}
    report['limitations']=['Same data provider and national-team domain; not broad deployment validation.','Recorded shot pressure/body part and completed-pass endpoint are event annotations, not screenshot inputs.','Regulation outcome includes stoppage goals; assumed added time is zero.','No joint possession/turnover/rebound transition validation or counterfactual action ground truth.','No screenshot pass outcomes have been independently annotated.']
    (ROOT/'ml/outlook-external-evaluation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:{'rows':report[k]['rows'],'checks':report[k]['checks'],'catboost':report[k]['metrics']['catboost'],'logistic':report[k]['metrics']['logistic']} for k in ['shot_scoring','shot_creation']},indent=2))
if __name__=='__main__':main()
