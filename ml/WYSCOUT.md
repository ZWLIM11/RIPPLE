# Wyscout follow-up experiment

Executed 2026-10-21. Plan fixed before training in `.scratch/playbook/spec.md`.

## Data and attribution

Pappalardo et al., *A public data set of spatio-temporal match events in soccer competitions*, Scientific Data 6, 236 (2019), https://doi.org/10.1038/s41597-019-0247-7.

Original events: https://figshare.com/articles/dataset/Events/7770599 (CC BY 4.0). Archive https://ndownloader.figshare.com/files/14464685, publisher MD5 `7c20e8647e7eda58d7838a0c7b1ec6ab`, verified before training. Official identifier maps: https://figshare.com/articles/dataset/Mapping_of_tag_identifiers_to_tag_names/11743818 and https://figshare.com/articles/dataset/Mapping_of_event_identifiers_to_event_names/11743836.

Only event 8 / subtype 85 (simple pass), with exactly one of tag 1801 (accurate) or 1802 (not accurate). Accuracy is the provider label, not a measured counterfactual outcome or our timing-engine viability. Seven numeric features come from release location only. Endpoints, IDs, timestamps and outcome annotations are excluded from inputs. No rows excluded for invalid locations or ambiguous labels in the two selected leagues.

## Evaluation

England 2017/18: 176,133 passes / 266 training matches, 39,090 / 57 validation matches, 36,182 / 57 calibration matches. Seed 42; match-disjoint random groups. France 2017/18 is first loaded only after model selection and calibration: 250,436 passes / 380 test matches. No France match occurs in England groups.

CatBoost depth 6 and 8, up to 600 iterations, learning rate .05, early stopping on validation only. Depth 8 / 145 trees selected. Logistic baseline uses the same seven features and standard scaling. Both classifiers receive separate Platt calibration fitted on the calibration partition. Constant baseline is the training positive rate.

| Test metric | Calibrated CatBoost | Calibrated logistic | Constant |
|---|---:|---:|---:|
| Log loss | 0.289646 | 0.289820 | 0.297705 |
| Brier | 0.078731 | 0.078797 | 0.080170 |
| ROC AUC | 0.623512 | 0.622978 | 0.500000 |
| ECE (15 equal-width bins) | 0.004705 | 0.002572 | 0.004182 |

Relative log-loss gain **0.0603%**, versus a predeclared minimum of **2%**. Whole-match bootstrap (2,000 draws) 95% interval: **0.0054%–0.1159%**. Brier, ECE and positive lower CI gates pass; the practical improvement gate fails. All aggregate metrics and match IDs are in `wyscout-evaluation.json`.

**Not approved for production.** The model cannot tell which intended receiver is better. Good aggregate calibration can coexist with weak discrimination and says nothing about unobserved alternative passes. This population differs from StatsBomb, so AUC differences are not a controlled model comparison. More release-location training is unlikely to solve the missing-input problem. The next experiment should use decision-time intended target and defender geometry with an independent match/competition holdout and an audit of target leakage and data rights.

## Reproduce

Install `ml/requirements.txt` into a Python environment. Download the official events archive to ignored `work/wyscout/events.zip`; the script checks its checksum. From the repository root:

```text
python ml/train_wyscout.py
python ml/test_wyscout.py
```

Trained weights, calibration objects and every holdout prediction are saved under ignored `ml/artifacts/wyscout/`. The verification tests reproduce all saved CatBoost predictions and metrics, check split isolation, and verify that changing endpoints, labels and identities cannot change features. No raw data or weights are included in the Cloudflare asset allowlist. Do not tune on this now-observed France holdout in a future experiment.
