"""Reproducible release-location research; never an alternative-receiver model.

Original data: Pappalardo et al., Scientific Data 6, 236 (2019), CC BY 4.0.
https://doi.org/10.1038/s41597-019-0247-7
https://figshare.com/articles/dataset/Events/7770599
Run from repo root: python ml/train_wyscout.py
"""
import hashlib
import json
from pathlib import Path
import zipfile
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss, brier_score_loss, roc_auc_score
import joblib

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'work/wyscout/events.zip'
EXPECTED_MD5 = '7c20e8647e7eda58d7838a0c7b1ec6ab'
FEATURES = ['start_x', 'start_y', 'x_squared', 'y_squared', 'xy', 'distance_goal', 'distance_touchline']


def features(event):
    """Only first position is read. No endpoints, tags, player IDs or event time."""
    p = event['positions'][0]
    x, y = float(p['x']) / 100, float(p['y']) / 100
    if not (np.isfinite(x) and np.isfinite(y) and 0 <= x <= 1 and 0 <= y <= 1):
        raise ValueError('Invalid release position')
    return [x, y, x*x, y*y, x*y, np.hypot((1-x)*105, (y-.5)*68)/105, min(y, 1-y)]


def read_league(league):
    with zipfile.ZipFile(ARCHIVE) as archive:
        key = next(n for n in archive.namelist() if n.endswith(f'events_{league}.json') and not n.startswith('__MACOSX'))
        events = json.loads(archive.read(key))
    rows = []
    excluded = 0
    for e in events:
        # Ordinary simple passes only: no high, head, hand, launch, cross or smart passes.
        if e.get('eventId') != 8 or e.get('subEventId') != 85:
            continue
        tags = {t['id'] for t in e['tags']}
        if (1801 in tags) == (1802 in tags):
            excluded += 1
            continue
        try:
            rows.append(features(e) + [int(1801 in tags), e['matchId']])
        except (ValueError, IndexError, KeyError):
            excluded += 1
    return pd.DataFrame(rows, columns=FEATURES+['label', 'match']), excluded


def calibrator(y, p):
    p = np.clip(p, 1e-6, 1-1e-6)
    return LogisticRegression(C=1e6, max_iter=1000).fit(np.log(p/(1-p)).reshape(-1, 1), y)


def calibrated(model, p):
    p = np.clip(p, 1e-6, 1-1e-6)
    return model.predict_proba(np.log(p/(1-p)).reshape(-1, 1))[:, 1]


def metrics(y, p):
    bins = np.minimum((p*15).astype(int), 14)
    ece = sum(np.mean(bins == b)*abs(np.mean(p[bins == b])-np.mean(y[bins == b])) for b in range(15) if np.any(bins == b))
    return dict(log_loss=float(log_loss(y, p)), brier=float(brier_score_loss(y, p)), roc_auc=float(roc_auc_score(y, p)), ece=float(ece))


def main():
    digest = hashlib.md5(ARCHIVE.read_bytes()).hexdigest()
    if digest != EXPECTED_MD5:
        raise ValueError('Archive checksum differs from original publisher metadata')
    england, excluded_en = read_league('England')
    ids = np.array(sorted(england.match.unique()))
    np.random.default_rng(42).shuffle(ids)
    a, b = int(len(ids)*.7), int(len(ids)*.85)
    groups = [ids[:a], ids[a:b], ids[b:]]
    train, valid, cal = [england[england.match.isin(group)] for group in groups]
    print('Partitions:', [(len(d), d.match.nunique()) for d in [train, valid, cal]], flush=True)
    logistic = make_pipeline(StandardScaler(), LogisticRegression(C=1, max_iter=2000))
    logistic.fit(train[FEATURES], train.label)
    candidates = []
    validation = []
    for depth in [6, 8]:
        model = CatBoostClassifier(iterations=600, depth=depth, learning_rate=.05, loss_function='Logloss',
                                   random_seed=42, thread_count=4, allow_writing_files=False, verbose=False)
        model.fit(train[FEATURES], train.label, eval_set=(valid[FEATURES], valid.label), early_stopping_rounds=60)
        loss = log_loss(valid.label, model.predict_proba(valid[FEATURES])[:, 1])
        candidates.append(model)
        validation.append(dict(depth=depth, trees=model.tree_count_, log_loss=float(loss)))
        print('Validation:', validation[-1], flush=True)
    chosen = int(np.argmin([v['log_loss'] for v in validation]))
    model = candidates[chosen]
    model_cal = calibrator(cal.label, model.predict_proba(cal[FEATURES])[:, 1])
    logistic_cal = calibrator(cal.label, logistic.predict_proba(cal[FEATURES])[:, 1])
    # France is first loaded after selection and calibration are finished.
    test, excluded_fr = read_league('France')
    assert not set(test.match).intersection(england.match)
    y = test.label.to_numpy()
    pc = calibrated(model_cal, model.predict_proba(test[FEATURES])[:, 1])
    pl = calibrated(logistic_cal, logistic.predict_proba(test[FEATURES])[:, 1])
    scores = {'catboost_calibrated': metrics(y, pc), 'logistic_calibrated': metrics(y, pl),
              'constant_train_rate': metrics(y, np.full(len(y), train.label.mean()))}
    gain = 1-scores['catboost_calibrated']['log_loss']/scores['logistic_calibrated']['log_loss']
    # Match-cluster bootstrap: resample whole test matches, not correlated individual passes.
    def loss_vector(p):
        p = np.clip(p, 1e-15, 1-1e-15)
        return -(y*np.log(p)+(1-y)*np.log(1-p))
    grouped = pd.DataFrame({'match': test.match.to_numpy(), 'cat': loss_vector(pc), 'log': loss_vector(pl)}).groupby('match').sum()
    rng = np.random.default_rng(2026)
    draws = rng.integers(0, len(grouped), size=(2000, len(grouped)))
    boot = 1-grouped.cat.to_numpy()[draws].sum(axis=1)/grouped.log.to_numpy()[draws].sum(axis=1)
    ci = np.quantile(boot, [.025, .975]).tolist()
    gates = {'relative_log_loss_gain_at_least_2_percent': bool(gain >= .02),
             'no_worse_brier': scores['catboost_calibrated']['brier'] <= scores['logistic_calibrated']['brier'],
             'ece_at_most_003': scores['catboost_calibrated']['ece'] <= .03,
             'bootstrap_gain_lower_bound_above_zero': ci[0] > 0}
    output = {
        'experiment': 'wyscout-release-location-v1', 'seed': 42,
        'source': {'article': 'https://doi.org/10.1038/s41597-019-0247-7', 'events': 'https://figshare.com/articles/dataset/Events/7770599',
                   'download': 'https://ndownloader.figshare.com/files/14464685', 'license': 'CC BY 4.0', 'md5': digest},
        'population': 'Simple passes (event 8, subtype 85) with exactly one accurate/inaccurate tag; provider accuracy is the label, not our physical viability.',
        'features': FEATURES, 'exclusions': {'England': excluded_en, 'France': excluded_fr},
        'partitions': {name: {'competition': league, 'passes': len(d), 'matches': int(d.match.nunique()), 'positive_rate': float(d.label.mean()), 'match_ids': sorted(int(i) for i in d.match.unique())}
                       for name, league, d in [('train','England',train),('validation','England',valid),('calibration','England',cal),('test','France',test)]},
        'validation_candidates': validation, 'chosen_depth': validation[chosen]['depth'], 'test_metrics': scores,
        'relative_log_loss_gain': float(gain), 'match_bootstrap_95_ci': ci, 'gates': gates,
        'statistical_gate_passed': all(gates.values()), 'production_approved': False,
        'limitations': ['Release location only; cannot distinguish receivers or intended target.',
                       'No defender geometry, velocity, pressure or target difficulty.',
                       '2017/18 league events do not validate synthetic-board inputs or current football.',
                       'Results on a different population are not directly comparable to the earlier StatsBomb experiment.'],
        'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    }
    (ROOT/'ml/wyscout-evaluation.json').write_text(json.dumps(output, indent=2)+'\n')
    artifacts = ROOT/'ml/artifacts/wyscout';artifacts.mkdir(parents=True, exist_ok=True)
    model.save_model(str(artifacts/'model.cbm'))
    joblib.dump({'catboost_calibration': model_cal, 'logistic': logistic, 'logistic_calibration': logistic_cal}, artifacts/'baselines.joblib')
    test.assign(catboost=pc, logistic=pl).to_csv(artifacts/'holdout.csv', index=False)
    print(json.dumps({'metrics': scores, 'gain': gain, 'ci': ci, 'gates': gates}, indent=2), flush=True)


if __name__ == '__main__':
    main()
