# External outlook validation
Status: resolved
Type: research

Freeze existing shot-scoring/creation artifacts before evaluating all available Euro 2024 matches from the pinned StatsBomb revision. Do not train, recalibrate or select thresholds on this corpus. Exclude any overlap with previous outlook partitions. Report log loss, Brier, AUC, ECE, reliability bins and match-bootstrap CatBoost-minus-logistic differences. Apply the existing comparative screen unchanged (2% log-loss gain, improved Brier, ECE <= .05, upper bootstrap bound < 0). This evaluates event inputs only and cannot certify screenshot or causal WPA accuracy. Evaluate the unchanged Poisson engine with prior training rates against historical regulation outcomes. Verify deployed assets and phone-width layout separately.


## Answer

Completed frozen evaluation on all 51 Euro 2024 matches: 1,201 eligible shots and 34,010 completed ground passes. Neither CatBoost candidate passed the unchanged comparative screen. Production-JS Poisson evaluation includes match-level uncertainty. Report: ml/outlook-external-evaluation.json; interpretation: ml/OUTLOOK.md. User explicitly deferred screenshot probability promotion due to missing independent labels. Verified 2fd3de3 live and exercised phone-width scenario/screenshot workflows. This resolves the bounded external test, not calibrated WPA research.
