# Wyscout independent experiment
Status: resolved
Type: research

Execute the predeclared experiment, retain provenance and aggregate evaluation, keep raw data and weights out of deployment. Report failed gates as clearly as successful ones.

## Answer

Trained CatBoost depths 6/8 and selected depth 8 on validation only. France holdout: 250,436 passes in 380 matches. Relative log-loss improvement over calibrated logistic was 0.0603%, below the 2% minimum. Model remains research-only. Four verification tests passed. See `ml/WYSCOUT.md` and `ml/wyscout-evaluation.json`.
