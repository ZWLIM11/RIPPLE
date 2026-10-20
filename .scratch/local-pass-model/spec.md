# Local CatBoost pass-completion research

Only v1zw. StatsBomb source revision 4b73468fc5b0f1950f9f66fada70ad3a4f9327cb.
Raw data and trained weights remain local under ignored work/ and ml/artifacts/.

Target: completion of an ordinary, ground, foot pass conditional on release context.
Inputs: start coordinates, under-pressure annotation, passing foot; derived start
geometry only. Exclude end coordinates, length, angle, duration, recipient, assists,
subsequent events and outcome from features. No candidate-specific probability claim.

2018 World Cup: deterministic match split into training, early-stopping validation
and sigmoid calibration partitions. Entire 2022 World Cup is untouched final test.
Compare CatBoost with logistic regression and training completion-rate constant.

Predeclared promotion gate: >=2% relative log-loss improvement over logistic and
constant on final test, lower Brier score than both, ECE <=0.05, and match-bootstrap
95% interval for CatBoost-minus-logistic log loss strictly below zero.
Also require honest deployment inputs and scope. No rerunning/tuning on final test.
If gate fails, retain research artifacts, report failure, do not connect probabilities.
If it passes, only offer explicitly labeled context estimates, requiring user-supplied
pressure, without replacing the existing route ranking.

Local research is not a claim of permission for commercial or prize submission use.
