# Screenshot prediction readiness — 26 October 2026

**Decision: not ready for screenshot passing percentages.** Keep the deployed heuristic board and experimental labels. No weights or app prediction behavior changed.

## New frozen-model audit

Used the existing visible-player CatBoost and calibrated logistic models, original four SkillCorner test matches, and 2,169 eligible attempts (398 failures). Verified source hashes and reproduced saved clean predictions to 1e-12 tolerance. No retraining, recalibration or threshold tuning. These matches were already examined: this is a diagnostic, not a fresh holdout. Conditions were recorded before running in ticket 11.

| Input condition | Scored | CatBoost log loss (lower better) | AUC | ECE | Mean absolute prediction change |
|---|---:|---:|---:|---:|---:|
| Clean provider-visible coordinates | 2,169 | .34949 | .8530 | .0287 | — |
| Remove nearest passing-lane defender | 2,160 | .41475 | .8383 | .0970 | 7.06 pp |
| Randomly omit 25% of defenders, five seeds | 2,161–2,167 | .37304–.39198 | .8130–.8372 | .0536–.0578 | 3.38–3.59 pp |
| Stretch horizontal coordinates by 5% | 2,052 | .34376 | .8486 | .0287 | .69 pp |
| Translate all positions horizontally by 2m | 2,144 | .34942 | .8527 | .0300 | .47 pp |

Removing the nearest defender increased predicted completion by 6.99 pp on average; 24.8% of predictions shifted more than 10 pp, and the 95th percentile absolute shift was 25.12 pp. Log loss worsened about 18.6% against clean predictions on the **same retained rows** (.34957). Calibration error .097 exceeded the original .05 gate. CatBoost still beat logistic on these corrupted inputs, but relative superiority does not make either model reliable.

Random omission exceeded the .05 ECE gate in all five seeds. Runs reuse the same attempts and must not be counted as independent samples. No-defender cases abstain; out-of-pitch transforms abstain instead of clipping. The scale/translation cohorts differ from the clean cohort: compare against clean predictions on identical rows in screenshot-robustness.json. Their lower aggregate loss is not an improvement. Simple affine perturbations do not simulate perspective distortion, lens distortion or player/team misidentification.

## Existing evidence and dataset boundaries

- StatsBomb completion-context model: AUC .7286, only .93% log-loss improvement over logistic; cannot distinguish alternative receivers.
- SkillCorner visible model: clean AUC .8530 and 2.20% log-loss gain, but four test matches in one league and provider-derived labels. AUC is not accuracy.
- Existing coordinate-noise tests: 1m noise log loss .36510, 2m .39536. Screenshot mapping errors matter.
- Actual independently reviewed screenshot benchmark remains **0 scored attempts**. The SoccerTrack panoramic clip does not establish pass prediction accuracy; the existing planar mapping probe found roughly 9.7m error.
- Metrica failed-pass intended targets were not established. Event-only datasets cannot independently validate image mapping and missing-player behavior.

## What can be used now

Use the app for heuristic route exploration and clearly labeled scenarios. Do not show learned screenshot completion percentages as validated. These tests also do not validate selecting the best unattempted pass or win probability added.

Next evidence: independently reviewed pre-release broadcast frames paired with outcome clips and intended receivers, including failures and missing-player cases. Keep whole new matches untouched. Measure coordinate error, eligibility/abstention coverage, calibration, log loss/Brier, per-match uncertainty and baseline comparisons through the actual app marking workflow. Do not tune an abstention rule on these four matches and claim validation on them.

## Reproduce

Run `python ml/audit_screenshot_robustness.py` with existing local SkillCorner cache/artifacts and the project ML dependencies. Aggregate results contain model/script hashes, coverage, exclusions and per-match scores. Raw inputs and weights stay ignored. Audit software tests: existing suite ran 34 tests (33 passed, one skipped for unavailable artifact); three new perturbation tests passed. Software tests verify implementation, not football prediction validity.
