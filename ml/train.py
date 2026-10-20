"""Reproducible temporal holdout. The test set never selects hyperparameters."""
import hashlib
import json
from pathlib import Path
import platform
import sys

import catboost
from catboost import CatBoostClassifier
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from download import CACHE, ROOT, REVISION
from features import FEATURES, extract

SEED = 20261020
ARTIFACTS = ROOT / "ml" / "artifacts"
REPORT = ROOT / "ml" / "evaluation.json"


def load():
    manifest = json.loads((CACHE / "manifest.json").read_text(encoding="utf-8"))
    if manifest["revision"] != REVISION:
        raise ValueError("Unexpected data revision")
    for record in manifest["files"]:
        digest = hashlib.sha256((CACHE / record["path"]).read_bytes()).hexdigest()
        if digest != record["sha256"]:
            raise ValueError(f"Data checksum mismatch: {record['path']}")
    rows, exclusions = [], {}
    for year, season in [(2018, 3), (2022, 106)]:
        matches = json.loads((CACHE / f"data/matches/43/{season}.json").read_text(encoding="utf-8"))
        for match in matches:
            mid = match["match_id"]
            events = json.loads((CACHE / f"data/events/{mid}.json").read_text(encoding="utf-8"))
            for event in events:
                sample = extract(event)
                if sample:
                    values, label = sample
                    rows.append(dict(zip(FEATURES, values), match_id=mid, year=year, label=label))
                elif event.get("type", {}).get("name") == "Pass":
                    exclusions[year] = exclusions.get(year, 0) + 1
    return pd.DataFrame(rows), exclusions


def split_matches(frame):
    ids = sorted(frame.loc[frame.year == 2018, "match_id"].unique().tolist())
    np.random.default_rng(SEED).shuffle(ids)
    partitions = {"train": ids[:40], "validation": ids[40:52], "calibration": ids[52:],
                  "test": sorted(frame.loc[frame.year == 2022, "match_id"].unique().tolist())}
    assert len(set(sum(partitions.values(), []))) == 128
    return {k: frame[frame.match_id.isin(v)].copy() for k, v in partitions.items()}, partitions


def calibrator(raw, labels):
    return LogisticRegression(C=1e6, random_state=SEED).fit(np.asarray(raw).reshape(-1, 1), labels)


def metrics(y, p):
    bins = []
    for lo in np.arange(0, 1, .1):
        mask = (p >= lo) & ((p < lo+.1) if lo < .9 else (p <= 1))
        if np.any(mask):
            bins.append({"lower": round(float(lo), 1), "count": int(mask.sum()),
                         "predicted": float(p[mask].mean()), "observed": float(y[mask].mean())})
    return {"log_loss": float(log_loss(y, p)), "brier": float(brier_score_loss(y, p)),
            "roc_auc": float(roc_auc_score(y, p)),
            "ece": float(sum(b["count"] * abs(b["predicted"]-b["observed"]) for b in bins)/len(y)),
            "reliability_bins": bins}


def bootstrap_difference(frame, cat_p, logistic_p):
    y = frame.label.to_numpy()
    def losses(p):
        p = np.clip(p, 1e-12, 1-1e-12)
        return -(y*np.log(p)+(1-y)*np.log(1-p))
    delta = losses(cat_p) - losses(logistic_p)
    groups = pd.DataFrame({"match": frame.match_id.to_numpy(), "delta": delta}).groupby("match").delta.agg(["sum", "count"]).to_numpy()
    rng = np.random.default_rng(SEED)
    sampled = groups[rng.integers(0, len(groups), size=(2000, len(groups)))]
    distribution = sampled[:, :, 0].sum(axis=1)/sampled[:, :, 1].sum(axis=1)
    return [float(v) for v in np.quantile(distribution, [.025, .975])]


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    frame, excluded = load()
    parts, ids = split_matches(frame)
    print("Eligible samples:", {k: len(v) for k, v in parts.items()}, flush=True)
    train, val, cal, test = [parts[k] for k in ("train", "validation", "calibration", "test")]
    model = CatBoostClassifier(iterations=400, depth=5, learning_rate=.04,
                               l2_leaf_reg=5, loss_function="Logloss", eval_metric="Logloss",
                               random_seed=SEED, thread_count=4, allow_writing_files=False,
                               verbose=100)
    model.fit(train[FEATURES], train.label, eval_set=(val[FEATURES], val.label),
              early_stopping_rounds=50, use_best_model=True)
    logistic = make_pipeline(StandardScaler(), LogisticRegression(C=1, max_iter=2000, random_state=SEED))
    logistic.fit(train[FEATURES], train.label)
    cb_cal = calibrator(model.predict(cal[FEATURES], prediction_type="RawFormulaVal"), cal.label)
    lr_cal = calibrator(logistic.decision_function(cal[FEATURES]), cal.label)
    raw = model.predict(test[FEATURES], prediction_type="RawFormulaVal")
    cb_p = cb_cal.predict_proba(np.asarray(raw).reshape(-1, 1))[:, 1]
    lr_p = lr_cal.predict_proba(logistic.decision_function(test[FEATURES]).reshape(-1, 1))[:, 1]
    const_p = np.full(len(test), train.label.mean())
    y = test.label.to_numpy()
    scores = {name: metrics(y, p) for name, p in [
        ("catboost_calibrated", cb_p), ("logistic_calibrated", lr_p), ("constant", const_p),
        ("catboost_raw", model.predict_proba(test[FEATURES])[:, 1])]}
    ci = bootstrap_difference(test, cb_p, lr_p)
    cb, lr, constant = [scores[k] for k in ("catboost_calibrated", "logistic_calibrated", "constant")]
    checks = {
        "logloss_improvement_over_logistic_at_least_2_percent": cb["log_loss"] <= .98*lr["log_loss"],
        "logloss_improvement_over_constant_at_least_2_percent": cb["log_loss"] <= .98*constant["log_loss"],
        "brier_better_than_both_baselines": cb["brier"] < min(lr["brier"], constant["brier"]),
        "ece_at_most_0_05": cb["ece"] <= .05,
        "match_bootstrap_interval_strictly_below_zero": ci[1] < 0,
    }
    report = {
        "experiment": "release-context-v1", "seed": SEED, "source_revision": REVISION,
        "source": "StatsBomb Open Data", "features": FEATURES,
        "scope": "Ordinary ground foot passes; context at release, not alternative-receiver probabilities.",
        "versions": {"python": platform.python_version(), "catboost": catboost.__version__,
                     "numpy": np.__version__, "pandas": pd.__version__, "sklearn": sklearn.__version__},
        "split": {k: {"matches": len(v), "match_ids": [int(i) for i in v],
                       "passes": len(parts[k]), "completion_rate": float(parts[k].label.mean())}
                  for k, v in ids.items()},
        "excluded_passes": excluded, "test_metrics": scores, "best_iteration": model.best_iteration_,
        "bootstrap_95_logloss_difference_catboost_minus_logistic": ci,
        "promotion_checks": checks, "statistical_gate_passed": all(checks.values()),
        "calibration": {"method": "sigmoid on independent 2018 calibration matches",
                        "coefficient": float(cb_cal.coef_[0, 0]), "intercept": float(cb_cal.intercept_[0])},
        "feature_importance": dict(zip(FEATURES, model.feature_importances_.tolist())),
        "limitations": [
            "No intended target, defender geometry, speed, facing or player ability features.",
            "Ground/foot pass scope conditions on action type; not all possible football actions.",
            "No counterfactual labels; observed action-selection bias remains.",
            "Pressure is an annotation, not a measured distance threshold.",
            "Test tournament contains teams/players also seen in training; this is not unseen-player validation.",
            "Calibration on real events does not validate synthetic board inputs.",
            "Data/weights remain local; permission for prize/commercial deployment is not established."
        ],
    }
    model.save_model(str(ARTIFACTS / "context-catboost.cbm"))
    model.save_model(str(ARTIFACTS / "context-catboost.json"), format="json")
    (ARTIFACTS / "calibration.json").write_text(json.dumps(report["calibration"], indent=2), encoding="utf-8")
    # Predictions are retained locally only for audit, never redistributed.
    pd.DataFrame({"match_id": test.match_id, "label": y, "catboost": cb_p,
                  "logistic": lr_p, "constant": const_p}).to_csv(ARTIFACTS / "holdout-predictions.csv", index=False)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"metrics": {k: {a: b for a, b in v.items() if a != "reliability_bins"} for k,v in scores.items()},
                      "bootstrap": ci, "promotion_checks": checks}, indent=2), flush=True)


if __name__ == "__main__":
    main()
