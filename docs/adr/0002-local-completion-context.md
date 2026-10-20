# Local completion-context research

Status: accepted for research, not app deployment

The original passing engine remains unchanged. A separate CatBoost classifier
learns observed ground-pass completion conditional on release context. It uses
neither recorded endpoints nor recipient identity, and cannot rank alternative
receivers. This statistical target is distinct from ADR-0001's physical estimates.

Training uses 2018 match partitions and final testing uses the 2022 World Cup.
The experiment did not pass its predeclared minimum relative improvement over
logistic regression. No ML percentage is added to the app. Trained weights and
data remain ignored local research artifacts; code and aggregate results are versioned.

Any future promotion requires stronger results, matching live inputs and explicit
handling of synthetic-board domain shift. Dataset/submission rights are a separate gate.
