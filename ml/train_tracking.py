"""Metrica completed-pass receiver-choice research. Not a completion model."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostRanker
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'work/metrica'
ART=ROOT/'ml/artifacts/tracking'
SHA='e706dd506b360d69d9d123d5b8026e7294b13996'
FEATURES=['distance','abs_dx','abs_dy','receiver_touchline','receiver_endline',
          'passer_touchline','passer_endline','passer_pressure','receiver_pressure','lane_clearance','lane_defenders_3m']


def geometry(passer, receiver, defenders):
    a,b,d=np.asarray(passer),np.asarray(receiver),np.asarray(defenders)
    if d.shape!=(11,2) or not np.isfinite(np.concatenate([a,b,d.ravel()])).all():
        raise ValueError('Complete finite defender geometry required')
    delta=b-a;distance=float(np.linalg.norm(delta))
    if distance<.1:raise ValueError('Coincident players')
    t=np.clip(((d-a)@delta)/(distance*distance),0,1)
    clearance=np.linalg.norm(d-a-t[:,None]*delta,axis=1)
    return [distance,abs(delta[0]),abs(delta[1]),min(b[1],68-b[1]),min(b[0],105-b[0]),
            min(a[1],68-a[1]),min(a[0],105-a[0]),float(np.linalg.norm(d-a,axis=1).min()),
            float(np.linalg.norm(d-b,axis=1).min()),float(clearance.min()),int((clearance<3).sum())]


def tracking(game,team):
    path=DATA/f'tracking{game}_{team}.csv'
    with path.open() as f:
        reader=csv.reader(f);next(reader);next(reader);header=next(reader)
    names=[name for name in header if name.startswith('Player')]
    data=pd.read_csv(path,skiprows=3,header=None,index_col=False)
    return data.set_index(1),[(name,header.index(name)) for name in names]


def release_positions(table,players,frame,period):
    if frame not in table.index:raise ValueError('missing_frame')
    row=table.loc[frame]
    if row[0]!=period:raise ValueError('period_mismatch')
    positions={}
    for name,col in players:
        x,y=row[col],row[col+1]
        if pd.isna(x) and pd.isna(y):continue  # inactive substitute
        if not np.isfinite([x,y]).all() or not (0<=x<=1 and 0<=y<=1):raise ValueError('invalid_or_off_pitch')
        positions[name]=np.array([x*105,y*68])
    if len(positions)!=11:raise ValueError('not_11_players')
    return positions


def extract(game):
    events=pd.read_csv(DATA/f'events{game}.csv')
    tables={team:tracking(game,team) for team in ['Home','Away']}
    rows=[];counts=Counter();audit={'pass_events':int((events.Type=='PASS').sum()),'failed_events':int(events.Type.isin(['BALL LOST','BALL OUT']).sum()),
                                 'failed_events_with_To':int((events.Type.isin(['BALL LOST','BALL OUT'])&events.To.notna()).sum())}
    for idx,e in events[events.Type=='PASS'].iterrows():
        try:
            if any(s in str(e.Subtype) for s in ['HEAD','CROSS','CLEARANCE','DEEP BALL']):raise ValueError('excluded_subtype')
            own=release_positions(*tables[e.Team],int(e['Start Frame']),int(e.Period))
            other=release_positions(*tables['Away' if e.Team=='Home' else 'Home'],int(e['Start Frame']),int(e.Period))
            if e.From not in own or e.To not in own or e.From==e.To:raise ValueError('missing_passer_or_receiver')
            group=[]
            for candidate,p in own.items():
                if candidate==e.From:continue
                features=geometry(own[e.From],p,list(other.values()))
                group.append(features+[int(candidate==e.To),idx,candidate,int(e.Period),float(e['Start Time [s]']),int(e['Start Frame'])])
            rows.extend(group);counts['included']+=1
        except ValueError as err:counts[str(err)]+=1
    frame=pd.DataFrame(rows,columns=FEATURES+['chosen','event','candidate','period','time','frame'])
    return frame,dict(counts),audit


def ranking(data,scores):
    scored=data.assign(score=scores)
    ranks=[]
    for event,g in scored.groupby('event',sort=False):
        # Stable ordering resolves exact ties consistently; no labels in the sort.
        order=g.sort_values('score',ascending=False,kind='stable')
        rank=int(np.flatnonzero(order.chosen.to_numpy()==1)[0])+1
        ranks.append({'event':int(event),'rank':rank,'block':f'{int(g.period.iloc[0])}-{int(g.time.iloc[0]//300)}'})
    ranks=pd.DataFrame(ranks)
    return {'top1':float((ranks['rank']==1).mean()),'top3':float((ranks['rank']<=3).mean()),'mrr':float((1/ranks['rank']).mean()),'events':len(ranks)},ranks


def main():
    ART.mkdir(parents=True,exist_ok=True)
    datasets={};exclusions={};labels={}
    for game in [1,2]:
        datasets[game],exclusions[game],labels[game]=extract(game)
        print('Game',game,'audit',exclusions[game],labels[game],flush=True)
    folds=[]
    for train_game,test_game in [(1,2),(2,1)]:
        train,test=datasets[train_game],datasets[test_game]
        model=CatBoostRanker(loss_function='PairLogit',depth=4,iterations=300,learning_rate=.03,
                            random_seed=42,thread_count=4,allow_writing_files=False,verbose=False)
        model.fit(train[FEATURES],train.chosen,group_id=train.event)
        logistic=make_pipeline(StandardScaler(),LogisticRegression(C=1,max_iter=2000))
        logistic.fit(train[FEATURES],train.chosen)
        predictions={'catboost':model.predict(test[FEATURES]),'logistic':logistic.decision_function(test[FEATURES]),'nearest':-test.distance.to_numpy()}
        results={};rankings={}
        for name,p in predictions.items():results[name],rankings[name]=ranking(test,p)
        intervals={};gains={}
        for baseline in ['logistic','nearest']:
            paired=rankings['catboost'].copy()
            paired['gain']=(paired['rank']==1).astype(float)-(rankings[baseline]['rank']==1).astype(float)
            block=paired.groupby('block').agg(total=('gain','sum'),n=('gain','size'))
            rng=np.random.default_rng(42);draws=rng.integers(0,len(block),size=(2000,len(block)))
            boot=block.total.to_numpy()[draws].sum(axis=1)/block.n.to_numpy()[draws].sum(axis=1)
            intervals[baseline]=np.quantile(boot,[.025,.975]).tolist()
            gains[baseline]=results['catboost']['top1']-results[baseline]['top1']
        name=f'train{train_game}_test{test_game}'
        model.save_model(str(ART/f'{name}.cbm'));joblib.dump(logistic,ART/f'{name}.joblib')
        test.assign(**predictions).to_csv(ART/f'{name}.csv',index=False)
        folds.append({'train_game':train_game,'test_game':test_game,'train_events':int(train.event.nunique()),'metrics':results,
                      'top1_absolute_gains':gains,'five_minute_block_bootstrap_95_ci':intervals})
        print(json.dumps(folds[-1],indent=2),flush=True)
    report={'experiment':'metrica-completed-pass-receiver-choice-v1','source':'https://github.com/metrica-sports/sample-data','commit':SHA,
            'source_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DATA.glob('*.csv'))},
            'features':FEATURES,'exclusions':exclusions,'label_audit':labels,'folds':folds,
            'exploratory_gate_passed':all(g>=.05 for f in folds for g in f['top1_absolute_gains'].values()),
            'production_approved':False,'target':'Receiver choice conditional on completed pass; unchosen candidates are NOT failed passes.',
            'limitations':['Only two anonymized matches; no match-level generalization interval.',
                           'No intended receiver for failed events: cannot estimate completion or causal best action.',
                           'Coordinates at release only; no future tracking or event endpoints used.',
                           'Ordinary/through-pass-like filtered population; height not fully annotated.',
                           'Partial screenshot inputs and retained movement assumptions are not validated.',
                           'Publisher asks public attribution; no explicit standard redistribution/commercial license established. Research artifacts kept local.'],
            'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (ROOT/'ml/tracking-evaluation.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':main()
