# Train and audit tracking choice
Status: resolved
Type: research

Execute the fixed plan, report both folds and limitations, verify source-time features and reproduced saved predictions. Do not integrate into the passing engine.

## Answer

Completed 2026-10-21. CatBoost receiver-choice top-1 accuracy was 47.10% on game 2 and 48.41% on game 1. Improvements over logistic were 3.83 and 6.63 percentage points, failing the predeclared five-point improvement requirement in both folds. No production integration or completion-probability claim.

All five tests in `ml/test_tracking.py` passed, covering release-frame isolation, geometry, candidate groups, endpoint/time perturbation invariance, and reproduction of saved predictions. Full provenance, exclusions, metrics and limitations: [report](../../../ml/TRACKING.md) and `ml/tracking-evaluation.json`. Raw data, weights and candidate predictions remain ignored local artifacts.
