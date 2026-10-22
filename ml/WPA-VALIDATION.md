# WPA validation: remaining evidence and next experiment

## Current decision

Keep screenshot probabilities experimental and keep production action impacts user-assumed. No transition model or calibrated WPA has been deployed. This audit establishes label feasibility, not predictive accuracy.

## Completed action-window audit

Source: **StatsBomb Open Data**, pinned revision `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb`.

![StatsBomb](assets/statsbomb.png)

Audited 179 matches: 2018 and 2022 World Cups plus Euro 2024. Included 120,021 ordinary ground passes and 4,033 open-play shots with an observed complete 15-second regulation window. Period-relative timestamps prevent half-time clock overlap; windows crossing the observed period end are excluded. Own Goal Against is counted once; duplicate Own Goal For is ignored. Five extraction/uncertainty software tests pass.

| Cohort | Eligible passes | Completed pass followed by opponent goal | Failed pass followed by own-team goal |
| --- | ---: | ---: | ---: |
| World Cup 2018 | 39,723 | 23 | 10 |
| World Cup 2022 | 44,337 | 29 | 12 |
| Euro 2024 | 35,961 | 13 | 15 |

These 102 action windows do not fit the current illustrative pass-branch tree. They are rare but important for honest probability modelling. These are overlapping action windows, **not 102 distinct goals**, and temporal association is not proof that the pass caused the goal. The current UI already discloses omitted branches; do not silently treat the audit frequencies as user-specific counterattack probabilities.

Only 27 failed-pass windows were followed by an opponent goal across all three cohorts. No eligible shot window was followed by an opponent goal within 15 seconds. That is insufficient evidence for a detailed conditional counter-goal model. No observed event does not establish zero risk; the report suppresses misleading zero-width bootstrap intervals in that case.

The audit also records last annotated possession within the window. This is an event-provider proxy, not continuous possession exactly at the horizon. Completed passes without a shot must not automatically be labelled retained possession. Missing/ambiguous possession remains unknown.

Run `python ml/test_transitions.py` and `python ml/audit_transitions.py` using the existing ML environment and caches. Aggregates: `ml/transition-audit.json`. No large video download or retraining is needed.

## What is needed to validate WPA

1. **Validate the match-outcome baseline.** Freeze a team-strength and remaining-time model, handle stoppage-time assumptions consistently, then test W/D/L calibration on a genuinely new set of matches. Report Brier, log loss and reliability with match-level uncertainty and score/minute subgroups. The present constant-rate Poisson model is an experimental baseline.
2. **Define a complete transition target.** Separate goal-for, goal-against, no-goal possession retained/lost/unknown, rebounds and censored windows. Allow events after both completed and failed actions. Do not call every opponent goal a counterattack. Predefine a horizon before inspecting another test set.
3. **Train only on decision-time information.** Use score/time, origin, current possession and known intended action inputs. Actual pass endpoint/outcome and future shot properties cannot be pre-action features. If intended receiver/target is unavailable for failed passes, restrict claims instead of inventing it.
4. **Validate the combined prediction.** On recorded chosen actions, test transition probabilities and the resulting expected win forecast against eventual match outcomes; compare against the pre-action forecast and simple baselines. Bootstrap by match, not pass. An improvement in chosen-action forecast error alone does not establish superior alternative-action ranking.
5. **Evaluate alternative-action claims separately.** Unchosen passes have no observed outcome. A claim that choosing a different pass improves winning needs defensible causal/off-policy assumptions and action-support checks, a validated simulator, or prospective evaluation. Expert review can check plausibility but cannot supply missing counterfactual ground truth.
6. **Keep screenshot validation separate.** It requires independently marked release frames, verified pass outcomes and supported camera calibration. The user has explicitly deferred this; the app continues to report visible-player geometry without calibrated completion percentages.

## Next bounded experiment

Build a decision-time possession-transition baseline before fitting rare goal branches. Start with regularized multinomial logistic regression; compare a more complex model only if it improves held-out scores. Use 2018 for development/calibration and 2022 for development evaluation. Treat Euro 2024 as already inspected, not pristine. Obtain another match-disjoint corpus for a frozen final test after the target, features and acceptance criteria are fixed. Increase independent rare-event support before claiming calibrated goal-against probabilities; widening the horizon changes the question and must be validated separately.

Do not promote based only on AUC or low aggregate calibration error. Require improvement over simple baselines, uncertainty that supports that improvement, acceptable subgroup calibration, and explicit coverage/abstention reporting. Numeric promotion thresholds must be set before evaluating the new corpus. Until then, the supported product is an explainable scenario explorer, not a validated best-action WPA predictor.
