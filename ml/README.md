# Local pass-completion research

**Decision: research only; not promoted into the app.** The first CatBoost model
was trained and tested locally. It did not reach the predeclared improvement gate.
The tactical board continues to use its existing physics/heuristic engine.

Data source: **StatsBomb Open Data**.

![StatsBomb attribution](assets/statsbomb.png)

This independent research is not endorsed by StatsBomb.

## Results — 20 October 2026

The final test consists of all 64 matches in the 2022 men's World Cup:
**44,847 eligible passes**, unseen during fitting, early stopping and calibration.

| Model | Log loss ↓ | Brier score ↓ | ROC AUC ↑ | ECE ↓ |
|---|---:|---:|---:|---:|
| Training completion-rate constant | 0.250965 | 0.064144 | 0.5000 | 0.006925 |
| Logistic regression + sigmoid calibration | 0.228450 | 0.060078 | 0.7184 | 0.010490 |
| CatBoost + sigmoid calibration | **0.226332** | **0.059374** | **0.7286** | 0.011646 |

CatBoost reduces log loss by **0.93% relative to logistic regression**. The 95%
match-bootstrap interval for its log-loss difference is [-0.002882, -0.001362],
so the improvement is consistent across resampled matches, but smaller than the
**2% minimum set before training**. Four of five statistical checks pass.

ECE alone can reward a constant predictor; it is not sufficient evidence of useful
prediction. Log loss and Brier score assess probability quality; ROC AUC assesses
ranking. None of these establish counterfactual correctness for alternative passes.

The uncalibrated CatBoost diagnostic scored 0.225333 log loss, better than the
calibrated version on this test. We do not switch versions after seeing test
outcomes. Future model selection needs fresh holdout data.

Full counts, match IDs, reliability bins, versions, feature importance and gate
results: [evaluation.json](evaluation.json).

## What this model predicts

Completion of an ordinary **ground foot pass**, conditional on annotated release
context: start X/Y, pressure flag and passing foot. Additional features derive
only from the start location (distance to goal/centre, squares and interaction).
StatsBomb coordinates are used directly; no metre-based speed/distance claims.

An absent pass outcome means completed; Incomplete, Out and Pass Offside mean
unsuccessful. Unknown and Injury Clearance are excluded. Explicit pass types
(including restarts/recovery), non-ground passes and non-foot passes are excluded.
These cohort restrictions condition on the kind of pass attempted.

Recorded endpoint, distance, angle, duration, recipient, assists, player/team IDs
and subsequent actions are not features. The outcome is used only as the label.
The endpoint of a failed pass is not a trustworthy intended target; using it would
create a mismatch with the board's proposed destination.

**This is not a receiver-selection model.** It cannot distinguish two target
receivers from the same starting context and passing foot. It does not model lane
geometry, velocity, preferred-foot ability or the board's difficulty score.
StatsBomb's annotated pressure must not be silently replaced with a geometric
distance threshold at inference.

## Experimental design

- Pinned source revision: `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb`.
- 2018 World Cup, deterministic split by match with seed 20261020:
  40 training matches / 24,644 passes; 12 early-stopping validation matches /
  7,207 passes; 12 sigmoid-calibration matches / 8,491 passes.
- 2022 World Cup is used only for final testing, not model selection.
- CatBoost: up to 400 trees, depth 5, learning rate .04, L2 5, CPU with 4 threads.
  Validation early stopping selected 127 trees.
- Logistic baseline: standardized same features, L2 logistic regression, then
  independent sigmoid calibration. Constant baseline uses training completion rate.
- No class weighting or oversampling, which would change raw probability meaning.
- 2,000 bootstrap draws resample whole test matches, preserving within-match
  dependence. Teams/players may overlap between tournaments.
- Promotion requires >=2% log-loss improvement over both baselines, lower Brier
  than both, ECE <=.05, and a strictly negative bootstrap difference interval.
  See the [predeclared specification](../.scratch/local-pass-model/spec.md).

## Reproduce locally

Python 3.13.9 was used. No Azure account, API key, GPU or paid API is needed.
From the repository root on Windows:

```powershell
python -m venv work/ml-venv
work/ml-venv/Scripts/python.exe -m pip install -r ml/requirements.txt
work/ml-venv/Scripts/python.exe ml/download.py
work/ml-venv/Scripts/python.exe ml/train.py
work/ml-venv/Scripts/python.exe -m unittest discover -s ml -p "test_*.py" -v
```

The downloader checks JSON and pins the revision; a local SHA-256 manifest is
verified before training. It downloads 128 event files plus match metadata.
Training writes ignored files into `ml/artifacts/`: native CatBoost model, JSON
model export, calibration coefficients and audit predictions. Downloaded data
stays in ignored `work/statsbomb/`. Aggregate evaluation is saved in this directory.
Artifact tests skip on a fresh clone until training has produced the local model.

All six ML tests passed on the completed run, including reload parity with the
saved holdout predictions, source checksums, split isolation, label handling and
invariance of features to post-action information. The existing app code was not changed.

The first run used a project-local environment with existing scientific packages;
the versions in requirements and evaluation record the actual training packages.

## Data rights and competition boundary

Read the [StatsBomb agreement](https://github.com/statsbomb/open-data/blob/master/LICENSE.pdf)
and [README attribution terms](https://github.com/statsbomb/open-data) before use.
The agreement permits research/analysis, restricts data redistribution and commercial
exploitation, and requires logo attribution for published analysis. Raw data and
trained weights are deliberately not included in Git. The logo here comes from
the provider's pinned repository `img/` directory for attribution.

Permission to use these trained weights in a prize entry or commercial deployment
is not established by this experiment. The hackathon app still uses synthetic match
events. Local training does not establish compliance with Microsoft technology or
submission requirements.

## Next model, before integration

1. Obtain or reconstruct **validated intended targets at pass release**, including
   failures; do not simply substitute observed interception/end locations.
2. Add release-time spatial context from 360/tracking, with visible-area and
   missing-player handling. This needs a separate experiment and fresh holdout.
3. Define the same features for live board input and assess domain shift.
4. Validate a useful improvement over the current baselines, then expose experimental
   probabilities separately from physical feasibility and attacking value.

Training on simulated labels from our own heuristics would primarily reproduce
those heuristics, not independently prove real-world accuracy.
