# Sensitivity features and possession baseline
Status: resolved
Type: task

Build and test two user-facing sensitivity tools, run a research-only event possession proxy baseline, document limitations, push to main after checks.

## Answer

Implemented both sensitivity tools without changing board state or exposing calibrated screenshot percentages. 62 app tests, five transition tests and Cloudflare dry run passed. Phone-width browser interactions passed. Possession proxy baseline trained/calibrated on disjoint 2018 matches and evaluated on reused 2022 development data: AUC .537, bootstrap difference crosses zero; not promoted. See docs/DECISION-SENSITIVITY.md.

