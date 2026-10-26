"""Frozen-model input robustness audit; not an independent screenshot benchmark."""
import json, hashlib
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from train_skillcorner import DATA, ART, ROOT, FEATURES, positions, geometry, predict, metrics

def perturb(a,b,d,kind,seed):
    points=np.array([a,b]+list(d),dtype=float)
    if kind=='drop_nearest':
        defenders=points[2:];delta=points[1]-points[0]
        t=np.clip((defenders-points[0])@delta/(delta@delta),0,1)
        index=np.argmin(np.linalg.norm(defenders-points[0]-t[:,None]*delta,axis=1))
        points=np.delete(points,index+2,axis=0)
    elif kind=='drop_random25':
        keep=np.random.default_rng(seed).random(len(points)-2)>=.25
        points=np.concatenate([points[:2],points[2:][keep]])
    elif kind=='scale_x5':points[:,0]*=1.05
    elif kind=='translate_x2':points[:,0]+=2
    elif kind!='clean':raise ValueError(kind)
    return points[0],points[1],points[2:]

def run():
    source=json.loads((ROOT/'ml/skillcorner-evaluation.json').read_text(encoding='utf-8'))
    model=CatBoostClassifier().load_model(str(ART/'visible.cbm'));bundle=joblib.load(ART/'visible.joblib')
    rows=[]
    for mid in source['splits']['test']:
        folder=DATA/str(mid);meta=json.loads((folder/'match.json').read_text(encoding='utf-8'))
        frames={f['frame']:f for f in json.loads((folder/'release.json').read_text(encoding='utf-8'))}
        for name in ['match.json','events.csv','release.json']:
            manifest=next(m for m in source['source_manifests'] if m['match']==mid)
            assert hashlib.sha256((folder/name).read_bytes()).hexdigest()==manifest['hashes'][name]
        events=pd.read_csv(folder/'events.csv',low_memory=False)
        for e in events.itertuples():
            if e.event_type!='player_possession' or e.pass_outcome not in ['successful','unsuccessful','offside']:continue
            try:
                a,b,d=positions(e,frames[int(e.frame_end)],meta,True)
                geometry(a,b,d,meta['pitch_length'],meta['pitch_width'])
                rows.append((mid,str(e.event_id),int(e.frame_end),int(e.pass_outcome=='successful'),a,b,d,meta))
            except (ValueError,KeyError,TypeError):continue
    report={'purpose':'Frozen-model robustness diagnostics on previously examined matches; no new validation claim','test_matches':source['splits']['test'],'eligible_clean':len(rows),'production_approved':False,'real_screenshot_validation':False,'model_hashes':{n:hashlib.sha256((ART/n).read_bytes()).hexdigest() for n in ['visible.cbm','visible.joblib']},'experiments':{}}
    clean=None
    for kind,seeds in [('clean',[0]),('drop_nearest',[0]),('drop_random25',list(range(5))),('scale_x5',[0]),('translate_x2',[0])]:
        for seed in seeds:
            data=[];indices=[];reject={}
            for index,(mid,event,frame,y,a,b,d,meta) in enumerate(rows):
                try:
                    aa,bb,dd=perturb(a,b,d,kind,seed+mid+frame)
                    pts=np.concatenate([[aa,bb],dd]);length,width=meta['pitch_length'],meta['pitch_width']
                    if (np.abs(pts[:,0])>length/2).any() or (np.abs(pts[:,1])>width/2).any():raise ValueError('outside_pitch')
                    data.append(geometry(aa,bb,dd,length,width));indices.append(index)
                except ValueError as exc:reject[str(exc)]=reject.get(str(exc),0)+1
            x=pd.DataFrame(data,columns=FEATURES);y=np.array([rows[i][3] for i in indices]);mids=np.array([rows[i][0] for i in indices])
            cp=predict(model,bundle['calibrator'],x);lp=bundle['logistic_cal'].predict_proba(bundle['logistic'].decision_function(x).reshape(-1,1))[:,1]
            if kind=='clean':
                clean=cp
                saved=pd.read_csv(ART/'visible-test.csv')
                assert list(saved['match'])==[r[0] for r in rows] and list(saved['event'].astype(str))==[r[1] for r in rows]
                assert np.allclose(clean,saved.catboost,atol=1e-12)
            delta=cp-clean[indices]
            c,l=metrics(y,cp),metrics(y,lp)
            result={'scored':len(y),'coverage':len(y)/len(rows),'rejections':reject,'catboost':c,'logistic':l,'relative_logloss_gain':1-c['log_loss']/l['log_loss'],'clean_on_same_rows':metrics(y,clean[indices]),'mean_absolute_change_pp':float(np.abs(delta).mean()*100),'p95_absolute_change_pp':float(np.quantile(np.abs(delta),.95)*100),'mean_signed_change_pp':float(delta.mean()*100),'fraction_changed_over_10pp':float((np.abs(delta)>.1).mean()),'per_match':{str(mid):metrics(y[mids==mid],cp[mids==mid]) for mid in np.unique(mids)}}
            report['experiments'][kind+('_seed'+str(seed) if kind=='drop_random25' else '')]=result
            print(kind,seed,'n',len(y),'logloss',round(c['log_loss'],5),'AUC',round(c['auc'],4),'gain',round(result['relative_logloss_gain']*100,2),'change_pp',round(result['mean_absolute_change_pp'],2),flush=True)
    report['script_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (ROOT/'ml/screenshot-robustness.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':run()
