# Audit, train and evaluate SkillCorner
Status: resolved
Type: research

Follow the predeclared spec. Preserve source hashes, match partitions, model artifacts and held-out scores. Test extraction and saved prediction reproduction. Document limitations and screenshot readiness.

## Answer

2026-10-21: audited 20 SkillCorner matches and 16,072 attempts, including 2,561 unsuccessful and 62 offside. Trained fixed complete and visible-only CatBoost classifiers with chronological 12/4/4 match splits, calibration and identical-feature logistic baselines. Visible model AUC .8530, log loss .34949, 2.20% improvement over logistic: statistical gate passed. Complete model 1.92% improvement: failed. Screenshot production gate remains unpassed; no real screenshot validation, provider target uncertainty, offscreen selection bias and 1–2m input noise degrade results. Six audit tests passed. Research artifacts saved locally, no app integration. See [report](../../../ml/SKILLCORNER.md) and `ml/skillcorner-evaluation.json`.
