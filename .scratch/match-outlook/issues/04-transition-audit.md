# Audit observed action-window branches
Status: resolved
Type: research

Audit 15-second regulation windows after ordinary ground passes and open-play shots in cached 2018, 2022 and Euro 2024 events. Use period-relative timestamp, require observed period end beyond horizon, count own-goal-against once, and keep omitted simulator branches visible. Report match-level uncertainty and rare goal counts before deciding on transition model fitting. This is an observational label feasibility audit, not causal WPA validation or a new untouched test. Do not change screenshot probabilities or production ranks.

## Answer

Completed observable 15-second branch audit across 179 matches. Found 102 pass windows in branches omitted by the illustrative simulator and only 27 failed-pass opponent-goal windows. Added five tests including period censoring, own-goal de-duplication and degenerate uncertainty handling. Recorded last provider possession as an explicit proxy. Detailed requirements and next experiment: ml/WPA-VALIDATION.md. Calibrated WPA remains open; no model promoted.

