# Validated alternative-pass probabilities
Type: research
Status: needs-info

The saved completion-context CatBoost artifacts reproduce the aggregate report.
Its 0.93% relative log-loss improvement remains below the predeclared 2% gate.
It does not distinguish alternative receivers.

Do not lower the gate or reinterpret heuristic scores as probabilities. Further
work needs intended-target and defender-geometry labels, a new held-out cohort,
calibration, and explicit synthetic-board domain-shift evaluation. Dataset rights
must cover the intended deployment. No deployable alternative-pass probability
model has been produced by this UI update.
