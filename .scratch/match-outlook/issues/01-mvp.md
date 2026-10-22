# Match outlook MVP
Status: resolved
Type: task

Audit complete: pass heuristics only; synthetic replay shot events are not a shooting model. Build isolated experimental engine and workspace, test and document limitations before pushing.

## Answer

Implemented isolated Match outlook workspace, Poisson baseline, geometric shot-opportunity heuristic and explicit user-assumed branch impact. No trained probabilities deployed. 55 tests pass; Cloudflare dry run passes. Browser scenario calculation verified, zero console errors; 390px viewport checked without page overflow. Documentation in docs/MATCH-OUTLOOK.md. New context remains session-only and English; advanced calibration and learned transition models deferred.
