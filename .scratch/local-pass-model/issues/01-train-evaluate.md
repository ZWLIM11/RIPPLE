# Train and evaluate local completion model
Type: task
Status: resolved

Implement reproducible download, leakage-safe extraction, grouped split, baselines,
calibration, tournament holdout, bootstrap and conditional app integration.

## Answer

Trained CatBoost locally using 2018 World Cup match partitions; tested on all 64
2022 World Cup matches (44,847 eligible passes). Calibrated CatBoost log loss
0.226332 versus logistic 0.228450: 0.93% improvement, below the predeclared 2% gate.
Four of five statistical checks pass. No app probability integration was performed.
The saved model reproduces the reported predictions; all six ML verification
tests pass. Code, aggregate metrics and attribution are committed; data/weights
remain local. See ml/README.md and ml/evaluation.json.
