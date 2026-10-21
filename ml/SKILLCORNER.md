# SkillCorner completion experiment — 2026-10-21

## Finding and source audit

Selected [SkillCorner Open Data](https://github.com/SkillCorner/opendata), pinned commit `4340d274572876239c154c90bc507a9b3250a656`. Credit: SkillCorner and its PySport open-data initiative. The pinned tree contains **20** matches (2024–25 Australian A-League), despite the README describing ten. Repository license: MIT; original notice is retained in `SKILLCORNER-LICENSE.txt`. No raw player data or weights are published by this change.

The provider's [Dynamic Events specification](https://26560301.fs1.hubspotusercontent-eu1.net/hubfs/26560301/Guides/Dynamic%20Events/20250216%20-%20Dynamic%20Events%20CSV%20Specifications.pdf) defines pass outcome and targeted-player ID, including missing targets when undetermined. Player possession ends at the last touch, supplying our release frame. Dynamic Events are derived from tracking and matched events, not independently audited human labels. We do not assume perfect target annotations.

Audited **16,072 attempts**: 13,449 successful, 2,561 unsuccessful, 62 offside. Three unsuccessful attempts have unknown targets; six attempts have invalid target identities. Offside is counted as failure. All pass heights are included: the provider's `high_pass` missingness differs by outcome, so filtering to explicit false would select successes unfairly.

Other sources reviewed:

| Source | Suitability for this experiment |
|---|---|
| [Metrica](https://github.com/metrica-sports/sample-data) | Previous local audit: failed events lack intended targets. |
| [Driblab](https://github.com/driblab/open-data) | Documents broadcast player/ball tracking; no intended-target failure labels established from the published schema. |
| [SoccerTrack v2](https://github.com/AtomScott/SoccerTrack-v2) | Useful for image-to-pitch reconstruction: full-pitch video, player coordinates and action labels. Its README does not establish intended-target outcome pairs for failed passes. |
| [SoccerNet](https://www.soccer-net.org/data) | Useful for detection/calibration/tracking evaluation; listed tasks do not establish the pass-target labels needed here. Some videos require access approval. |

## Fixed method

Plan recorded before fitting in `.scratch/skillcorner/spec.md`. Whole matches in chronological order: first 12 training, next four calibration, final four testing. No player identities, provider xPass, outcomes, reception positions, speeds or post-release frames are features. Target ID selects a candidate's release coordinates; the target identity itself is not a feature.

Raw release geometry yields 12 numeric features: candidate distance/displacement, pitch-boundary distances, nearest defender distances, minimum defender-to-pass-segment clearance, defenders within 3m of the segment, and observed defender count. Two separate models:

- **Complete:** requires 11 players per team; may use provider-extrapolated offscreen positions. This is not available from an ordinary cropped screenshot.
- **Visible:** only `is_detected=true` positions; passer and target must both be visible, with at least one visible defender. Offscreen defenders are unknown. This filtering changes the evaluated population; the two model scores are not an apples-to-apples comparison.

CatBoost depth 4, 400 trees, learning rate .03, seed 42. Standardized logistic baseline uses identical features. Both receive sigmoid calibration using calibration matches only; training prevalence is the constant baseline. No hyperparameter tuning. The fixed run was repeated to add baseline predictions under the identical noise perturbations; no parameters, partition, or features changed after test inspection.

## Held-out results

| Model/input | Test attempts | Failures | AUC | Log loss | Brier | ECE |
|---|---:|---:|---:|---:|---:|---:|
| CatBoost, complete | 2,925 | 604 | .8565 | .36686 | .11925 | .03249 |
| Logistic, complete | 2,925 | 604 | .8547 | .37403 | .12061 | .03865 |
| Constant, complete | 2,925 | 604 | .5000 | .52197 | .16737 | .05925 |
| CatBoost, visible | 2,169 | 398 | .8530 | .34949 | .11042 | .02869 |
| Logistic, visible | 2,169 | 398 | .8459 | .35735 | .11169 | .02624 |
| Constant, visible | 2,169 | 398 | .5000 | .48718 | .15248 | .05154 |

AUC measures discrimination; **.853 is not 85.3% accuracy**. Lower log loss/Brier is better. ECE is the weighted absolute calibration gap in ten equal-width probability bins, not a guarantee for individual predictions.

The complete model improves log loss 1.92% over logistic, narrowly failing the fixed 2% requirement. The visible model improves **2.20%**, and passes the predeclared statistical gate (AUC >=.70, ECE <=.05, at least 100 failures, improved Brier and >=2% log-loss gain over both baselines). Match-bootstrap 95% absolute log-loss gain intervals versus logistic: complete [.00290,.01210], visible [.00453,.01096]. Only four test matches: these intervals are exploratory and cannot establish broad generalization.

## Screenshot input stress test

Independent Gaussian position perturbations, standard deviation 1m or 2m per coordinate, fixed seed; clipped to pitch boundaries. This models only one simplified source of marking error. It does not model team mistakes, missing visible defenders, correlated perspective errors, incorrect release timing or image detection.

| Visible CatBoost inputs | AUC | Log loss | Logistic same inputs | Mean absolute probability change |
|---|---:|---:|---:|---:|
| Clean tracked positions | .8530 | .34949 | .35735 | — |
| 1m coordinate noise | .8299 | .36510 | .37251 | 4.91 percentage points |
| 2m coordinate noise | .7921 | .39536 | .39910 | 7.51 percentage points |

At 1m the log-loss advantage over logistic drops to about 1.99%; at 2m it is about .94%, below the clean-input gate. This argues for further validation, not relaxed thresholds.

## Readiness decision

**Promising research model, not ready for screenshot passing percentages.** No app integration or Cloudflare changes were made.

Remaining limitations:

- Actual screenshots have not been independently annotated and evaluated through our screenshot lab. Provider-detected coordinates are a proxy, not our detector's output.
- Full tracking may contain temporal extrapolation/smoothing; reading only the release frame does not prove the provider reconstructed it causally. The visible experiment removes explicitly extrapolated players but cannot audit provider processing.
- Visible filtering retains 12,742 of 16,072 attempts overall (10,903 successes, 1,839 failures including offside). Missing targets/offscreen players disproportionately remove failures. Predictions are conditional on this selected population.
- One league/season, repeated teams, only four final test matches, provider-inferred labels, and all-height passes. Not a validated ground-pass or other-league model.
- It estimates outcomes of observed attempts with known intended targets; it does not establish that an unattempted alternative is optimal. A single frame also lacks pass speed/height, motion and body orientation.

Next evidence needed: a **new untouched** match set with independent intended-target/outcome checks, plus paired screenshots and manually verified release-time pitch coordinates. Evaluate the entire screenshot import/calibration/player-marking workflow against held-out outcomes, including incomplete frames and abstentions. Do not keep tuning on these four test matches.

## Reproduction and verification

Use `ml/requirements.txt` in a Python environment with joblib (installed with scikit-learn). Run:

```text
python ml/fetch_skillcorner.py
python ml/train_skillcorner.py
python ml/test_skillcorner.py
```

The downloader verifies all original tracking streams against pinned Git LFS SHA-256 values, retaining only release frames. Source/event/metadata/release hashes, exclusions, partitions, per-match metrics and stress results are in `skillcorner-evaluation.json`. Raw source caches and trained model/calibration artifacts remain ignored in `work/skillcorner/` and `ml/artifacts/skillcorner/`.

Six audit tests cover source hashes, disjoint chronological match splits, exclusion of outcome/future fields, offscreen-player removal, geometry, and reproduction of saved model/baseline predictions and metrics.
