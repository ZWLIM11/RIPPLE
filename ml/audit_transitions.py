"""Audit observable 15-second outcomes; not action-value or causal validation."""
from collections import Counter,defaultdict
from pathlib import Path
import hashlib,json
import numpy as np
from download import ROOT,REVISION

WINDOW=15

def seconds(event):
    h,m,s=event['timestamp'].split(':')
    return int(h)*3600+int(m)*60+float(s)

def scoring_team(e,home,away):
    team=e.get('team',{}).get('id');typ=e.get('type',{}).get('name')
    if typ=='Shot' and e.get('shot',{}).get('outcome',{}).get('name')=='Goal':return team
    if typ=='Own Goal Against':return away if team==home else home
    return None # Own Goal For is a duplicate representation.

def audit(events,home,away):
    records=[];excluded=Counter()
    periods={p:[e for e in events if e.get('period')==p] for p in [1,2]}
    for period,seq in periods.items():
        endings=[seconds(e) for e in seq if e.get('type',{}).get('name')=='Half End']
        end=max(endings) if endings else None
        for i,e in enumerate(seq):
            typ=e.get('type',{}).get('name');p=e.get('pass',{});s=e.get('shot',{})
            if typ=='Pass' and p.get('height',{}).get('name')=='Ground Pass' and not p.get('type'):kind='pass'
            elif typ=='Shot' and s.get('type',{}).get('name')=='Open Play':kind='shot'
            else:continue
            if end is None:excluded['no_observed_period_end']+=1;continue
            start=seconds(e)
            if start+WINDOW>end:excluded['period_boundary_censored']+=1;continue
            if e.get('duration',0)>WINDOW:excluded['action_exceeds_window']+=1;continue
            team=e['team']['id'];future=[]
            for f in seq[i:]:
                t=seconds(f)
                if t>start+WINDOW:break
                if t>=start:future.append(f)
            scorers=[scoring_team(f,home,away) for f in future];scorers=[t for t in scorers if t is not None]
            own=sum(t==team for t in scorers);opp=len(scorers)-own
            completed=kind=='pass' and not p.get('outcome')
            own_shot=any(f.get('type',{}).get('name')=='Shot' and f.get('team',{}).get('id')==team for f in future)
            same_possession_shot=any(f.get('type',{}).get('name')=='Shot' and f.get('team',{}).get('id')==team and f.get('possession')==e.get('possession') for f in future)
            if len(scorers)>1:branch='omitted_multiple_goals'
            elif kind=='pass' and completed:
                branch='omitted_completed_pass_opponent_goal' if opp else 'goal' if own else 'completed_shot_no_goal' if own_shot else 'completed_no_shot'
            elif kind=='pass':
                branch='omitted_failed_pass_own_goal' if own else 'failure_opponent_goal' if opp else 'failure_no_goal'
            else:
                branch='goal' if own else 'failure_opponent_goal' if opp else 'failure_no_goal'
            records.append({'event_id':e.get('id'),'origin':e.get('location'),'pressure':bool(e.get('under_pressure',False)),'minute':e.get('minute',0),'kind':kind,'branch':branch,'completed':completed,'own_goal':own,'opponent_goal':opp,'own_shot_in_window':own_shot,'same_possession_shot':same_possession_shot,'last_recorded_possession':('own' if future[-1].get('possession_team',{}).get('id')==team else 'opponent' if future[-1].get('possession_team',{}).get('id') in [home,away] else 'unknown')})
    return records,excluded

def summarize(matches):
    rows=[r for rs in matches.values() for r in rs];counts=Counter(r['branch'] for r in rows)
    result={'attempts':len(rows),'matches':len(matches),'branch_counts':dict(counts),'last_recorded_possession_counts':dict(Counter(r['last_recorded_possession'] for r in rows)),'omitted_branch_attempts':sum(v for k,v in counts.items() if k.startswith('omitted_')),'goals_for':sum(r['own_goal'] for r in rows),'goals_against':sum(r['opponent_goal'] for r in rows)}
    # One goal can label several overlapping actions; counts are not independent goals.
    rng=np.random.default_rng(20261020);groups=np.array([[len(rs),sum(r['opponent_goal']>0 for r in rs)] for rs in matches.values()])
    if len(rows):
        draws=groups[rng.integers(0,len(groups),(2000,len(groups)))].sum(axis=1)
        rates=draws[:,1]/np.maximum(1,draws[:,0])
        result['opponent_goal_window_rate_95']=np.quantile(rates,[.025,.975]).tolist() if groups[:,1].sum()>0 else None
        if groups[:,1].sum()==0:result['uncertainty_note']='No observed opponent goals; empirical bootstrap is degenerate and cannot establish zero risk.'
    return result

def main():
    cohorts=[('worldcup2018',ROOT.parent/'PassDetective/work/statsbomb','data/matches/43/3.json'),('worldcup2022',ROOT.parent/'PassDetective/work/statsbomb','data/matches/43/106.json'),('euro2024',ROOT/'work/euro2024','data/matches/55/282.json')]
    report={'window_seconds':WINDOW,'production_approved':False,'revision':REVISION,'cohorts':{}}
    checked=set()
    for name,cache,path in cohorts:
        if cache not in checked:
            manifest=json.loads((cache/'manifest.json').read_text());assert manifest['revision']==REVISION
            for f in manifest['files']:assert hashlib.sha256((cache/f['path']).read_bytes()).hexdigest()==f['sha256']
            checked.add(cache)
        groups={'pass':{},'shot':{}};exclusions=Counter()
        for m in json.loads((cache/path).read_text(encoding='utf-8')):
            events=json.loads((cache/f"data/events/{m['match_id']}.json").read_text(encoding='utf-8'))
            records,exc=audit(events,m['home_team']['home_team_id'],m['away_team']['away_team_id']);exclusions.update(exc)
            for kind in groups:groups[kind][m['match_id']]=[r for r in records if r['kind']==kind]
        report['cohorts'][name]={**{k:summarize(v) for k,v in groups.items()},'exclusions':dict(exclusions)}
    report['limitations']=['Retrospective recorded-action labels, not alternative-action outcomes.','Opponent goal within 15 seconds is not necessarily a counterattack caused by the action.','Overlapping action windows may share goals; uncertainty resamples matches.','A completed-pass no-shot branch can still lose possession; branch labels do not model every possession transition.','All cohorts have already been inspected in this project; a later fitted transition model needs an additional frozen external test.','Last recorded possession within the horizon is a provider event annotation, not continuous control measured exactly at 15 seconds.','No screenshot input or detection validation.']
    (ROOT/'ml/transition-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
