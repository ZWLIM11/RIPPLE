# Receiver-choice experiment with tracking

Executed 2026-10-21. Fixed plan: `.scratch/tracking-choice/spec.md`. This is a different task from the earlier StatsBomb/Wyscout completion-context classifiers, so their metrics are not directly comparable.

## Label audit and provenance

Source: [Metrica Sports sample tracking and event data](https://github.com/metrica-sports/sample-data), commit `e706dd506b360d69d9d123d5b8026e7294b13996`. Original event definitions: `documentation/events-definitions.pdf` at that commit. The provider defines PASS as a same-team possession transfer. Games 1 and 2 contain 590 BALL LOST/BALL OUT events and **none has a To receiver label**. Therefore this dataset cannot supervise intended-target completion for failures without additional annotation. We do not infer targets from where intercepted balls ended up.

Task: rank the teammate who actually receives a completed pass, conditional on such an event. Ten candidate teammates per event; only the observed receiver has label 1. Label 0 means **unchosen**, not a failed or inferior pass. No safety or completion probabilities are produced.

The repository requests responsible use and public attribution. It does not establish a standard commercial/redistribution license in the reviewed README; no claim of competition eligibility follows from public availability. Raw data and trained models remain ignored local research artifacts. This report attributes the original provider; source CSV SHA-256 hashes are in `tracking-evaluation.json`.

## Method

- Release-frame synchronized tracking only. No recorded endpoints, end times, later frames or player identities as features.
- Candidate receiver location, passer location and all 11 defenders. Missing/off-pitch coordinates cause exclusion, rather than invented players.
- Distance, absolute displacement, boundary distances, passer/receiver pressure, defender-to-segment clearance and lane defender count. No future-derived attacking direction.
- Excluded HEAD/CROSS/CLEARANCE/DEEP BALL annotations. Remaining events are not guaranteed to be ground passes because height is not exhaustively annotated.
- Fixed CatBoostRanker PairLogit: depth 4, 300 iterations, learning rate .03, seed 42. No tuning on either test game. Logistic candidate-choice and nearest-teammate baselines.
- Train game 1/test game 2, then separately train game 2/test game 1. A test game never participates in fitting its fold. The reverse fold is a robustness check, not a fresh confirmation after tuning.

Game 1: 799 PASS events; 694 retained, 76 missing/off-pitch exclusions, 29 subtype exclusions. Game 2: 964 PASS events; 862 retained, 66 missing/off-pitch exclusions, 36 subtype exclusions. Strict complete-team filtering can introduce selection bias.

## Results

| Held-out game | Events | CatBoost top-1 | Logistic top-1 | Nearest top-1 | CatBoost top-3 |
|---|---:|---:|---:|---:|---:|
| Game 2 | 862 | 47.10% | 43.27% | 34.34% | 81.79% |
| Game 1 | 694 | 48.41% | 41.79% | 30.26% | 78.24% |

CatBoost MRR: 0.6580 in both folds. Uniform random top-1 expectation with ten candidates is 10%, but logistic is the more informative baseline.

Top-1 improvements over logistic: **+3.83** and **+6.63 percentage points**. Predeclared exploratory gate required at least +5 points over both baselines in both folds: **failed** on game 2. Five-minute-block bootstrap intervals versus logistic are [1.11, 6.56] and [3.61, 9.29] percentage points. These intervals describe within-game uncertainty, not generalization across leagues or matches; two matches cannot establish that.

## Decision

**Do not deploy.** There is encouraging evidence that richer geometry helps this receiver-choice task, but only two matches, a selected successful-pass population, unknown failure targets, and unvalidated screenshot inputs. The ranker imitates observed choices, not optimal decisions. It provides no calibrated completion probability.

For the next completion experiment, obtain synchronized tracking with intended-receiver annotations for **both successful and failed attempts**, more independent matches/teams, explicit use rights, and matching live inputs. Split by match/competition before training. Do not keep tuning against these already-inspected matches.

## Reproduce

Use `ml/requirements.txt`. Place the six original files under ignored `work/metrica/` as `events1.csv`, `events2.csv`, and `tracking{1,2}_{Home,Away}.csv`; source paths are `data/Sample_Game_N/Sample_Game_N_RawEventsData.csv` and `Sample_Game_N_RawTrackingData_TEAM_Team.csv` at the pinned commit. Verify hashes against the report. Run:

```text
python ml/train_tracking.py
python ml/test_tracking.py
```

Saved weights, logistic pipelines and every held-out candidate score are under ignored `ml/artifacts/tracking/`. Tests verify future-frame isolation, endpoint/time perturbation invariance, complete geometry, one chosen receiver per candidate group, and reproduction of both saved models' held-out rankings. No application or Cloudflare code changes in this experiment.
