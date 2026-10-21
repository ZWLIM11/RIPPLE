# Screenshot-compatible completion experiment

Pinned SkillCorner source: 4340d274572876239c154c90bc507a9b3250a656. Audit all available match event files for successful/unsuccessful/offside passes and intended-target coverage. Unknown targets are excluded and counted by outcome; do not infer them from endpoints. Provider labels are not independently verified human ground truth.

Before fitting: chronological match split 60% training, 20% calibration, 20% final test (whole matches). Fixed CatBoost depth 4, 400 trees, learning rate .03, seed 42; standardized logistic baseline and training prevalence baseline. Fit sigmoid calibration on calibration matches only. No tuning after test inspection. Use only raw release-frame player geometry, no provider xPass, reception coordinates, speeds, future frames or event aggregates. All attempted pass heights are included because high_pass missingness is outcome-dependent. Offside counts as failure.

Compare complete 22-player geometry and visible-only geometry (passer/target detected, at least one detected defender). Visible model records visible defender count, never invents offscreen defenders. Screenshot tests: visible-only input and fixed 1m/2m coordinate-noise perturbations. These are input stress tests, not validation of actual image detection or calibration.

Gate: >=2% lower held-out log loss than logistic and prevalence, AUC >=.70, ECE <=.05, no worse Brier score; report per-match results and match-bootstrap improvement interval. At least 100 held-out failures. Report all results, including noise degradation. Production additionally requires independent real screenshot landmark/player annotations and validation; never promote from simulated noise alone.
