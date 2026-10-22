# Decision sensitivity

## Find a decision flip

In **Tactics board**, open the comparison section and select **Find a decision flip**. The engine takes the highest-scoring viable route, selects the three closest opponents to its straight segment, and moves one opponent at a time toward that segment in steps of 1 m up to 6 m (clamped at the segment). At each position it recomputes candidate passes. It reports the first sampled change in leading receiver, including the defender and coordinates.

This is a bounded sensitivity search, not the globally smallest change, a defender movement forecast, a receiver-switch probability or WPA. The board is never mutated. No flip found does not mean robust against all changes. Results clear when the board, movement settings, objective or replay state changes. The search runs only on request, not during dragging.

## Unmarked-opponent sensitivity

In **Screenshot lab**, calibrate a supported rectangle and mark two teammates. **Analyse visible route** now also places one hypothetical opponent at 0/1/3/5 m sideways from the route midpoint and reports the minimum straight-segment clearance including marked opponents. Both sides are considered if in the pitch. This is deliberately an assumption exercise: a candidate position may be inside the camera view, and no actual unseen player is located. No completion percentage or safety verdict is produced. All 11 opponents marked disables the extra-opponent experiment. Marker/selection changes clear stale results.

## Research baseline

`python ml/train_possession_baseline.py` fits a regularized logistic model using origin x/y, annotated pressure and match minute only. No endpoint, pass outcome, receiver result or future shot properties enter the features. Training: 48 World Cup 2018 matches (29,240 passes), calibration: 16 matches (10,483), development evaluation: 64 World Cup 2022 matches (44,337).

Target: last provider possession annotation within a complete 15-second window belongs to the acting team. This is a proxy, not continuous control precisely at 15 seconds. Development AUC 0.5370, log loss 0.4919, Brier 0.1563, ECE 0.0169. Low ECE does not make this useful for alternative-action ranking. There is no intended target feature, no untouched external evaluation, and no joint scoring/turnover model. It remains research-only and is not connected to the app. Results: `ml/possession-baseline.json`.

Screenshot probabilities remain experimental; validated WPA is still unfinished. New feature copy is English, consistent with the experimental Match outlook panel.

Research source: **StatsBomb Open Data**, pinned revision `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb`.

![StatsBomb](../ml/assets/statsbomb.png)

The possession baseline's match-bootstrap log-loss difference versus a constant is [-0.00252, 0.00141], spanning zero: no reliable improvement established. Verification: 62 app tests, five transition audit tests and Cloudflare dry run passed. Browser checks confirmed decision-flip output, two-player sensitivity, stale-selection clearing and no page-wide overflow at 375px content width in a 390px phone frame.
