# Experimental match outlook MVP

Implement the supplied win probability spec as an isolated Match outlook workspace. Existing code has pass heuristics and synthetic shot events but no shooting-opportunity calculation. Add a pure Poisson outcome engine, a geometric shot heuristic (not xG), and explicit user-assumed outcome branches for selected feasible passes/direct shot. Missing assumptions yield no impact. Keep existing passing rankings unchanged. Scenario horizon replaces baseline goal generation during that interval; remaining Poisson starts after it. Include turnover/conceding and no-goal branches. Regulation plus stoppage only; no extra time/penalties. No trained model promotion.

Files: outcome-model.js, outcome-ui.js, outcome.css; workspace routing, index scripts, build asset allowlist; model/UI tests and docs. Validate normalization, terminal states, symmetry, invalid input, branching, no mutation and live refresh.
