"""Evaluate independently annotated screenshots. Does not perform image detection."""
import argparse
import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from train_skillcorner import ROOT,ART,FEATURES,geometry,predict,metrics

FROZEN_MODELS={'visible.cbm':'774ea4db28895644d6a8033ffd0afc66a919c1519e965da6b919d31783f35c19',
               'visible.joblib':'aad325d7338122055e0e324ae4f73f3949e314f59e58a261abb21987a821fec0'}

def validate(row,root,known):
    if row.get('abstention'):return str(row['abstention'])
    if row.get('source_dataset')=='SkillCorner' and str(row.get('match_id')) in known:return 'previously_used_match'
    for key in ['id','source_url','source_dataset','match_id','image_sha256','marker','outcome_reviewer','clip_reference']:
        if not isinstance(row.get(key),str) or not row[key].strip():return 'missing_'+key
    if row['marker']==row['outcome_reviewer']:return 'independent_outcome_review_required'
    if row.get('real_image') is not True:return 'real_image_required'
    if row.get('marked_before_outcome_review') is not True:return 'outcome_blinding_required'
    if row.get('all_visible_defenders_marked') is not True:return 'visible_defender_review_required'
    if row.get('release_frame_verified') is not True:return 'release_frame_review_required'
    if row.get('outcome') not in ['successful','unsuccessful','offside']:return 'unknown_outcome'
    image=(root/row.get('image','')).resolve()
    if not image.is_relative_to(root.resolve()) or not image.is_file():return 'missing_or_external_image'
    if hashlib.sha256(image.read_bytes()).hexdigest()!=row['image_sha256']:return 'image_hash_mismatch'
    return None

def project(rows):
    result=subprocess.run(['node',str(ROOT/'ml/project_screenshot.mjs')],input=json.dumps(rows),capture_output=True,text=True,check=True)
    return json.loads(result.stdout)

def evaluate(manifest_path):
    model_hashes={name:hashlib.sha256((ART/name).read_bytes()).hexdigest() for name in FROZEN_MODELS}
    if model_hashes!=FROZEN_MODELS:raise ValueError('Frozen model artifacts changed; do not silently replace the benchmark model')
    manifest_path=Path(manifest_path);manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    rows=manifest['attempts'];ids=[r.get('id') for r in rows]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate attempt IDs')
    prior=json.loads((ROOT/'ml/skillcorner-evaluation.json').read_text(encoding='utf-8'))
    known={str(i) for values in prior['splits'].values() for i in values}
    rejected=Counter();eligible=[]
    for row in rows:
        reason=validate(row,manifest_path.parent,known)
        if reason:rejected[reason]+=1
        else:eligible.append(row)
    projected=project(eligible) if eligible else []
    features=[];scored=[]
    for row,p in zip(eligible,projected):
        try:
            if 'error' in p:raise ValueError(p['error'])
            xy=lambda point:[point['x']-52.5,point['y']-34]
            features.append(geometry(xy(p['passer']),xy(p['target']),[xy(d) for d in p['defenders']],105,68))
            scored.append(row)
        except ValueError as e:rejected[str(e)]+=1
    report={'sampled_attempts':len(rows),'scored_attempts':len(scored),'coverage':len(scored)/len(rows) if rows else None,
            'rejections':dict(rejected),'research_gate_passed':False,'production_approved':False,
            'status':'awaiting_independent_annotated_footage' if not scored else 'evaluated',
            'mode':'manual_screenshot_marks_using_production_projection',
            'model_hashes':model_hashes,
            'projection_hashes':{name:hashlib.sha256((ROOT/'prototypes/pass-detective'/name).read_bytes()).hexdigest() for name in ['snapshot-model.js','frame-model.js']},
            'manifest_sha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest()}
    if not scored:return report
    model=CatBoostClassifier();model.load_model(str(ART/'visible.cbm'));bundle=joblib.load(ART/'visible.joblib')
    x=pd.DataFrame(features,columns=FEATURES);y=np.array([int(r['outcome']=='successful') for r in scored])
    predictions={'catboost':predict(model,bundle['calibrator'],x),
                 'logistic':bundle['logistic_cal'].predict_proba(bundle['logistic'].decision_function(x).reshape(-1,1))[:,1]}
    report['metrics']={k:metrics(y,p) for k,p in predictions.items()}
    groups=np.array([r['source_dataset']+':'+r['match_id'] for r in scored]);report['matches']=len(set(groups))
    report['per_match']={g:{k:metrics(y[groups==g],p[groups==g]) for k,p in predictions.items()} for g in sorted(set(groups))}
    report['predictions']=[{'id':r['id'],'outcome':r['outcome'],**{k:float(p[i]) for k,p in predictions.items()}} for i,r in enumerate(scored)]
    c,l=report['metrics']['catboost'],report['metrics']['logistic']
    report['research_gate_passed']=bool(len(scored)>=500 and c['failures']>=100 and report['matches']>=5 and report['coverage']>=.8 and c['auc'] is not None and c['auc']>=.7 and c['ece']<=.05 and c['log_loss']<=.98*l['log_loss'] and c['brier']<=l['brier'])
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('manifest');parser.add_argument('--output',required=True);args=parser.parse_args()
    result=evaluate(args.manifest);Path(args.output).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='predictions'},indent=2))
