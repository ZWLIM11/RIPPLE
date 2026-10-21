"""Research completion classifier from raw release-frame geometry only."""
import hashlib
import json
from collections import Counter
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss, brier_score_loss, roc_auc_score
from fetch_skillcorner import DATA, ROOT, SHA

ART=ROOT/'ml/artifacts/skillcorner'
FEATURES=['distance','abs_dx','abs_dy','receiver_touchline','receiver_endline',
          'passer_touchline','passer_endline','passer_pressure','receiver_pressure',
          'lane_clearance','lane_defenders_3m','defenders_observed']

def geometry(a,b,d,length,width):
    a,b,d=np.asarray(a,float),np.asarray(b,float),np.asarray(d,float)
    if a.shape!=(2,) or b.shape!=(2,) or d.ndim!=2 or d.shape[1]!=2 or len(d)==0:
        raise ValueError('missing_geometry')
    if not np.isfinite(np.concatenate([a,b,d.ravel()])).all():raise ValueError('nonfinite')
    delta=b-a;distance=np.linalg.norm(delta)
    if distance<.1:raise ValueError('coincident')
    t=np.clip((d-a)@delta/(distance**2),0,1)
    clearance=np.linalg.norm(d-a-t[:,None]*delta,axis=1)
    return [distance,abs(delta[0]),abs(delta[1]),width/2-abs(b[1]),length/2-abs(b[0]),
            width/2-abs(a[1]),length/2-abs(a[0]),np.linalg.norm(d-a,axis=1).min(),
            np.linalg.norm(d-b,axis=1).min(),clearance.min(),int((clearance<3).sum()),len(d)]

def positions(event,frame,meta,visible):
    if frame['frame']!=int(event.frame_end) or frame['period']!=int(event.period):raise ValueError('frame_mismatch')
    teams={p['id']:p['team_id'] for p in meta['players']}
    passer=int(event.player_id);receiver=int(event.player_targeted_id)
    if passer==receiver or teams.get(passer)!=teams.get(receiver):raise ValueError('invalid_target')
    players={p['player_id']:p for p in frame['player_data'] if not visible or p.get('is_detected') is True}
    if passer not in players or receiver not in players:raise ValueError('target_or_passer_not_visible' if visible else 'missing_target_or_passer')
    own=[p for pid,p in players.items() if teams.get(pid)==teams[passer]]
    other=[p for pid,p in players.items() if pid in teams and teams[pid]!=teams[passer]]
    if not visible and (len(own)!=11 or len(other)!=11):raise ValueError('not_22_players')
    if not other:raise ValueError('no_visible_defenders')
    a=[players[passer]['x'],players[passer]['y']];b=[players[receiver]['x'],players[receiver]['y']]
    d=[[p['x'],p['y']] for p in other]
    points=np.array([a,b]+d,float)
    if not np.isfinite(points).all():raise ValueError('nonfinite')
    if (np.abs(points[:,0])>meta['pitch_length']/2).any() or (np.abs(points[:,1])>meta['pitch_width']/2).any():raise ValueError('off_pitch')
    return a,b,d

def extract(folder,visible=False,noise=0):
    meta=json.loads((folder/'match.json').read_text(encoding='utf-8'))
    frames={f['frame']:f for f in json.loads((folder/'release.json').read_text(encoding='utf-8'))}
    events=pd.read_csv(folder/'events.csv',low_memory=False)
    events=events[(events.event_type=='player_possession')&events.pass_outcome.isin(['successful','unsuccessful','offside'])]
    counts=Counter();rows=[]
    for e in events.itertuples():
        outcome=e.pass_outcome;counts['attempts_'+outcome]+=1
        try:
            if pd.isna(e.player_targeted_id):raise ValueError('unknown_target')
            if pd.isna(e.frame_end) or int(e.frame_end) not in frames:raise ValueError('missing_frame')
            a,b,d=positions(e,frames[int(e.frame_end)],meta,visible)
            if noise:
                rng=np.random.default_rng(int(meta['id'])+int(e.frame_end))
                points=np.array([a,b]+d)+rng.normal(0,noise,(len(d)+2,2))
                points[:,0]=points[:,0].clip(-meta['pitch_length']/2,meta['pitch_length']/2)
                points[:,1]=points[:,1].clip(-meta['pitch_width']/2,meta['pitch_width']/2)
                a,b,d=points[0],points[1],points[2:]
            features=geometry(a,b,d,meta['pitch_length'],meta['pitch_width'])
            rows.append(features+[int(outcome=='successful'),meta['id'],e.event_id,int(e.frame_end)])
            counts['included_'+outcome]+=1
        except ValueError as err:counts[str(err)+'_'+outcome]+=1
    return pd.DataFrame(rows,columns=FEATURES+['completed','match','event','frame']),dict(counts)

def metrics(y,p):
    y=np.asarray(y);p=np.clip(p,1e-8,1-1e-8);bins=np.minimum((p*10).astype(int),9)
    ece=sum(np.mean(bins==i)*abs(y[bins==i].mean()-p[bins==i].mean()) for i in range(10) if (bins==i).any())
    return {'n':len(y),'failures':int((y==0).sum()),'completion_rate':float(y.mean()),
            'log_loss':float(log_loss(y,p,labels=[0,1])),'brier':float(brier_score_loss(y,p)),
            'auc':float(roc_auc_score(y,p)) if len(set(y))==2 else None,'ece':float(ece)}

def predict(model,calibrator,x):
    raw=model.predict(x,prediction_type='RawFormulaVal').reshape(-1,1)
    return calibrator.predict_proba(raw)[:,1]

def run():
    ART.mkdir(parents=True,exist_ok=True)
    folders=sorted([p.parent for p in DATA.glob('*/manifest.json')],key=lambda p:(json.loads((p/'match.json').read_text(encoding='utf-8'))['date_time'],int(p.name)))
    if len(folders)!=20:raise ValueError('Expected all 20 pinned matches')
    splits={'train':[int(p.name) for p in folders[:12]],'calibration':[int(p.name) for p in folders[12:16]],'test':[int(p.name) for p in folders[16:]]}
    report={'source':'https://github.com/SkillCorner/opendata','commit':SHA,'splits':splits,'features':FEATURES,'experiments':{},
            'source_manifests':[json.loads((p/'manifest.json').read_text(encoding='utf-8')) for p in folders],
            'production_approved':False,'real_screenshot_validation':False}
    for visible in [False,True]:
        name='visible' if visible else 'complete';data=[];audit={}
        for folder in folders:
            df,counts=extract(folder,visible);data.append(df);audit[folder.name]=counts
        data=pd.concat(data,ignore_index=True)
        train,cal,test=[data[data['match'].isin(splits[key])].copy() for key in ['train','calibration','test']]
        if any(df.completed.nunique()!=2 for df in [train,cal,test]):raise ValueError('Both outcomes required')
        model=CatBoostClassifier(depth=4,iterations=400,learning_rate=.03,loss_function='Logloss',random_seed=42,thread_count=4,verbose=False,allow_writing_files=False)
        model.fit(train[FEATURES],train.completed)
        calibrator=LogisticRegression(C=1e6,max_iter=2000).fit(model.predict(cal[FEATURES],prediction_type='RawFormulaVal').reshape(-1,1),cal.completed)
        logistic=make_pipeline(StandardScaler(),LogisticRegression(C=1,max_iter=2000)).fit(train[FEATURES],train.completed)
        logistic_cal=LogisticRegression(C=1e6,max_iter=2000).fit(logistic.decision_function(cal[FEATURES]).reshape(-1,1),cal.completed)
        predictions={'catboost':predict(model,calibrator,test[FEATURES]),
                     'logistic':logistic_cal.predict_proba(logistic.decision_function(test[FEATURES]).reshape(-1,1))[:,1],
                     'prevalence':np.full(len(test),train.completed.mean())}
        result={'audit':audit,'counts':{k:metrics(df.completed,np.full(len(df),train.completed.mean())) for k,df in [('train',train),('calibration',cal),('test',test)]},
                'metrics':{k:metrics(test.completed,p) for k,p in predictions.items()}}
        scores=test.assign(**predictions);result['per_match']={str(mid):{k:metrics(g.completed,g[k]) for k in predictions} for mid,g in scores.groupby('match')}
        # Cluster bootstrap: resample whole test matches, never individual passes.
        block=[]
        for _,g in scores.groupby('match'):
            y=g.completed.to_numpy();c=np.clip(g.catboost,1e-8,1-1e-8);l=np.clip(g.logistic,1e-8,1-1e-8)
            gain=(-y*np.log(l)-(1-y)*np.log(1-l))-(-y*np.log(c)-(1-y)*np.log(1-c))
            block.append([gain.sum(),len(g)])
        block=np.array(block);draws=np.random.default_rng(42).integers(0,len(block),(2000,len(block)))
        boot=block[draws,0].sum(axis=1)/block[draws,1].sum(axis=1)
        result['match_bootstrap_logloss_gain_95_ci']=np.quantile(boot,[.025,.975]).tolist()
        m=result['metrics'];c=m['catboost']
        result['statistical_gate_passed']=bool(c['failures']>=100 and c['auc']>=.70 and c['ece']<=.05 and all(c['log_loss']<=.98*m[b]['log_loss'] and c['brier']<=m[b]['brier'] for b in ['logistic','prevalence']))
        result['noise_stress']={}
        for sigma in [1,2]:
            noisy=pd.concat([extract(p,visible,sigma)[0] for p in folders[16:]],ignore_index=True)
            assert list(zip(noisy['match'],noisy.event))==list(zip(test['match'],test.event))
            p=predict(model,calibrator,noisy[FEATURES])
            q=logistic_cal.predict_proba(logistic.decision_function(noisy[FEATURES]).reshape(-1,1))[:,1]
            result['noise_stress'][str(sigma)+'m']={**metrics(noisy.completed,p),'mean_absolute_probability_change':float(np.abs(p-predictions['catboost']).mean()),
                'logistic_same_noise':metrics(noisy.completed,q)}
        model.save_model(str(ART/f'{name}.cbm'))
        joblib.dump({'calibrator':calibrator,'logistic':logistic,'logistic_cal':logistic_cal},ART/f'{name}.joblib')
        scores.to_csv(ART/f'{name}-test.csv',index=False)
        report['experiments'][name]=result
        print(name,json.dumps({k:v for k,v in result.items() if k not in ['audit','per_match']}),flush=True)
    report['script_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (ROOT/'ml/skillcorner-evaluation.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':run()
