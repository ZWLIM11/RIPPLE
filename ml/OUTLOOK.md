# Shot and match-outlook research

Source: **StatsBomb Open Data**, pinned revision `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb`.

![StatsBomb](assets/statsbomb.png)

Reproduce from repo root: `python ml/train_outlook.py --cache ../PassDetective/work/statsbomb`. An alternative cache path can be supplied. The script verifies every cached file against its manifest. No new download is needed when this corpus is already available. Artifacts remain ignored under `ml/artifacts/outlook`.

## Fixed experiment

2018 World Cup: 48 match training partition, 16 disjoint calibration matches. 2022: 64 temporal test matches. Seed 20261020. This tournament was used by earlier passing research; it is not an entirely untouched project holdout. No hyperparameter search on these results: depth 4, 300 iterations, learning rate .03, Platt calibration; compare calibrated logistic and training-rate baseline. Match bootstrap, 2,000 resamples, assesses the CatBoost-minus-logistic log-loss difference.

Shot scoring: 2,821 eligible open-play foot/header shots across both tournaments. Only release x/y, distance, angle, pressure and header flag are features. Outcome and provider xG never enter features. Shot creation: 78,131 completed ordinary ground passes, with a same-team shot within 10 seconds in the same possession as label. Features are receiving x/y, distance and goal angle. Recorded endpoint is retrospective evidence; this target is conditional on completion, not failed-pass intent or counterfactual passing value.

| Temporal test | CatBoost AUC | CatBoost log loss | Logistic log loss | CatBoost Brier | Logistic Brier |
|---|---:|---:|---:|---:|---:|
| Shot scoring | .7843 | .3027 | .2992 | .0882 | .0865 |
| Shot creation | .8844 | .1215 | .1210 | .0319 | .0318 |

Both improve over a constant-rate baseline, but **neither passes the fixed comparative screen defined before this run**: CatBoost must improve log loss by >=2%, improve Brier, have ECE <=.05 and a match-bootstrap interval strictly below zero. No claim is made that a single failed screen invalidates all possible shot models. The better logistic results do not resolve screenshot input mismatch or counterfactual validation. Nothing is deployed as a calibrated percentage.

## Historical Poisson check

The actual JavaScript `OutcomeModel.outcome` evaluates 64 test matches at 0/30/60/75/85 minutes. Training-only mean rates are 1.4375 and 1.125 goals per match. Multiclass Brier (sum across three categories, lower is better) is .6433/.6016/.3948/.3540/.1375 respectively. Full aggregate output is `outlook-evaluation.json`.

These are descriptive held-out errors, not production calibration certification: national-team tournament home/away designation is largely neutral, rates are not team-specific, added time is set to zero while regulation labels include stoppage, repeated snapshots are correlated, and no extra-time/shootout outcome is included. The calculation is not an action-value evaluation. A possession transition model and independently verified screenshot inputs remain missing for validated WPA.

## Required before any promotion

Collect a genuinely new match-disjoint corpus, available-at-decision intended-target/pressure/body-part inputs, independent visibility review, and possession/turnover/rebound outcomes. Predeclare promotion criteria, evaluate calibration and uncertainty by match, and validate the complete pipeline. Observed successful actions alone cannot validate what would have happened after an unchosen pass.


## New external test: Euro 2024 (22 October 2026)

All 51 matches were downloaded from the same pinned StatsBomb Open Data revision (about 160 MB of event JSON, no video). Match IDs are disjoint from the previous outlook partitions. The existing models and calibrators were frozen: no fitting, recalibration, threshold selection or hyperparameter search was performed. Artifact hashes before and after evaluation match. This is a new tournament evaluation, still within the same provider/national-team domain.

| Task | Eligible rows | Positive outcomes | CatBoost AUC | CatBoost log loss | Logistic log loss | CatBoost ECE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Shot scoring | 1,201 | 95 | 0.7121 | 0.2554 | 0.2546 | 0.0165 |
| Shot creation after completed ground pass | 34,010 | 1,654 | 0.8722 | 0.1416 | 0.1413 | 0.0044 |

Both CatBoost candidates again fail the unchanged comparative screen. Their match-bootstrap log-loss differences from logistic include zero; the evidence does not establish an improvement. Both outperform the training constant baseline on log loss/Brier. Low aggregate ECE alone is insufficient for promotion.

The unchanged production Poisson engine was also evaluated at five match times using the prior training-only rates. Multiclass Brier sums at 0/30/60/75/85 minutes are 0.6876/0.5642/0.4561/0.5113/0.3788. The report includes 95% match-bootstrap intervals. Results are not monotonically better later in the match, and the 85-minute interval is wide (0.1864–0.5816); this does not support a broad calibration claim.

Reproduce: `python ml/fetch_outlook_holdout.py`, then `python ml/validate_outlook.py`. Requires the previously trained artifacts. Aggregate results and provenance hashes: `ml/outlook-external-evaluation.json`. Raw events stay under ignored `work/euro2024`.

Screenshot evaluation was rerun and still has zero independently annotated eligible attempts. Following the user's decision, screenshot probabilities remain experimental; the visible-player tool continues to report geometric measurements without a completion percentage. Joint transition/counterfactual WPA validation remains unsupported by this event-only test. No research model has been promoted into the app.
