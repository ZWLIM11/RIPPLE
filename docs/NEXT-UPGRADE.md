# RIPPLE — next upgrade roadmap

Updated: 22 October 2026 (Asia/Kuala_Lumpur)

This is a plan for a future session, not a claim that the items below are implemented. Inspect the current branch and documentation before starting. Baseline release: `89ab37e` on `ZWLIM11/RIPPLE` main. Live site: https://ripple.limziwei2004.workers.dev/.

## Current status

| Feature | Implemented | Remaining |
| --- | --- | --- |
| Pass vs shoot vs keep possession | Feasible passing options and hypothetical direct-shot scenarios | A distinct keep-possession action with explicit outcome assumptions |
| Decision flip | Bounded, on-demand search over nearby defender movements | Optional visual preview and broader search; do not claim a global minimum |
| Missing-player sensitivity | Hypothetical opponent positions and straight-route clearance | Optional user-controlled positions; no unseen-player detection or calibrated percentages |
| Score-aware tactics | Score/time affect experimental W/D/L probabilities | Explicit tactical preference guidance; board rankings currently do not adapt automatically |
| Win-impact scenarios | Expected win change under user-entered probabilities | Validated transition probabilities and predictive WPA |

Screenshot analysis works from visible marked players; it does not require all 22 players. Full-board import is a separate optional workflow. Preserve this distinction.

## Priority 1 — add keep-possession comparison

- [ ] Define the action as an explicit scenario such as holding/recycling possession over a chosen interval. Do not invent a receiver, dribble trajectory or successful retention.
- [ ] Add a third action family alongside pass and direct shot in Match outlook.
- [ ] Define exhaustive, mutually exclusive branches, including retention, turnover and scoring/conceding where supported. Label omitted events.
- [ ] Use the same comparison horizon and match-state assumptions for all actions. Explain differences if a user chooses unequal windows.
- [ ] Keep probability inputs as user assumptions until calibrated models are approved. Never derive retention probability from the passing heuristic.
- [ ] Reuse the pure outcome engine and existing scenario save/load/export format. Version or migrate saved files if their structure changes.
- [ ] Show the action, assumptions, expected win/draw/loss and illustrative percentage-point change together.

Acceptance checks:

- Branch probabilities sum to one and all values remain within bounds.
- The action window cannot exceed remaining match time.
- Full-time, zero-rate, invalid-input and turnover extremes behave consistently.
- Goals are not counted both in explicit branches and the subsequent Poisson period.
- No-goal possession states must not acquire invented predictive differences. If they share future rates, disclose that limitation.
- Saved older scenarios still load safely; edited assumptions invalidate old results.

## Priority 2 — score-aware tactical guidance

- [ ] Add an opt-in experimental context guide: protecting a lead, level match, or chasing a goal.
- [ ] Explain the tradeoff using current score, remaining time and the chosen objective. Let the user override it.
- [ ] Preserve physical feasibility/offside checks regardless of tactical preference.
- [ ] Keep the existing progress/retain-possession objectives understandable. If score-dependent weights are introduced, document them as design choices, not learned optimal strategy.
- [ ] Separate a tactical preference from the action with greatest illustrative win impact. They need not agree.
- [ ] Compare the same board at 0–1, 1–1 and 2–1 late in the match; explain exactly what changed.

Acceptance checks:

- Score changes update context guidance and clear stale scenario calculations.
- Guidance cannot turn a rejected pass into a feasible one.
- Explicit user overrides persist predictably across navigation and scenario restore.
- Do not claim that keeping possession always improves winning chances when leading, or that riskier play is always optimal when trailing.

## Priority 3 — make sensitivity results easier to explore

- [ ] Preview the tested defender movement on the pitch using a clearly marked hypothetical overlay.
- [ ] Allow a reversible apply/undo action only when the user chooses it; running the search itself must not mutate the board.
- [ ] Show the original and changed receiver/route side by side.
- [ ] Optionally let users choose the defender, search direction and distance limit.
- [ ] In Screenshot lab, allow users to adjust a hypothetical opponent position while keeping real marks separate.
- [ ] Keep the distinction between an unmarked player and an actually off-camera player: the current tool cannot determine visibility boundaries.

Acceptance checks:

- Search stays bounded and runs on demand, not on every drag frame.
- No flip found is described as a limited search result, not proof of robustness.
- Changed board, marks, selection, objective or replay state invalidates dependent results.
- Labels and controls remain readable at phone widths; test 360px and 390px layouts.

## Separate research track — credible WPA

Do not make feature delivery depend on pretending the research is complete.

1. Improve the possession target: last recorded provider possession is a proxy and may be stale through stoppages. Define retained/lost/unknown/dead-ball states and censoring explicitly.
2. Complete transition branches, including opponent goals after completed passes, own-team goals after failed passes, rebounds and multiple-event windows.
3. Use only decision-time features. Actual endpoint, eventual completion and future shot properties must not leak into pre-action predictions. Intended-target data is needed to compare receivers.
4. Improve and validate the match outcome baseline, including team strengths and consistent stoppage-time treatment.
5. Freeze targets, features, hyperparameters and acceptance criteria before obtaining a new external evaluation. All previously inspected 2018/2022/Euro 2024 data are development evidence now.
6. Evaluate the combined forecast against baselines using Brier, log loss, calibration, coverage and match-level confidence intervals. Include score/time subgroups.
7. Treat alternative-action claims separately: the outcome of an unchosen pass is not observed. Define defensible causal/off-policy assumptions, a validated simulator or a prospective evaluation before claiming that an alternative would increase winning chances.

Existing evidence:

- Shot scoring and shot creation CatBoost candidates failed comparative screens on 2022 and Euro 2024.
- Possession proxy baseline: AUC 0.537; improvement over constant-rate prediction was not statistically established.
- Transition audit: 179 matches, 120,021 pass windows and 4,033 shot windows. Only 27 failed-pass windows preceded opponent goals within 15 seconds; overlapping windows are not independent goals.
- No research model is approved as calibrated WPA.

**User decision: keep screenshot probabilities experimental for now.** Do not silently enable completion percentages. Independent footage/marking/outcome validation remains deferred.

## Files and evidence to read first

- [Match outlook implementation and limitations](MATCH-OUTLOOK.md)
- [Sensitivity tools and possession baseline](DECISION-SENSITIVITY.md)
- [WPA validation requirements](../ml/WPA-VALIDATION.md)
- [Shot and match-outlook research](../ml/OUTLOOK.md)
- [External evaluation results](../ml/outlook-external-evaluation.json)
- [Possession baseline results](../ml/possession-baseline.json)
- [Transition audit](../ml/transition-audit.json)
- [Screenshot benchmark requirements](../ml/SCREENSHOT-BENCHMARK.md)
- `prototypes/pass-detective/outcome-model.js`, `outcome-ui.js`, `outcome.css`
- `prototypes/pass-detective/intelligence.js`, `comparison.js`, `frame-model.js`, `frame-ui.js`
- `tests/outcome.test.mjs`, `tests/decision.test.mjs`, `tests/studio.test.mjs`
- Repository `AGENTS.md`, `GLOSSARY.md` and relevant `docs/adr/` decisions

## Delivery checklist for the next session

- [ ] Inspect git state and preserve unrelated edits.
- [ ] Create scoped tickets under `.scratch/` following repository instructions.
- [ ] Implement Priority 1, then Priority 2; keep optional polish separate.
- [ ] Run meaningful regression tests (`npm test`) and `npm run check:cloudflare`.
- [ ] Test desktop and phone interactions, including persistence and stale-result clearing.
- [ ] Keep images, raw datasets, trained artifacts and secrets out of public build assets.
- [ ] Commit/push to RIPPLE main only within the user's current authorization; never confuse this repo with the teammate's PassDetective repo.
- [ ] Verify Cloudflare serves the changed assets before claiming deployment is live.
- [ ] Report implemented features, remaining research gaps, test results and any checks that could not be completed.

## Suggested next-session request

> Read docs/NEXT-UPGRADE.md and inspect the current RIPPLE implementation. Start with keep-possession comparison, then opt-in score-aware tactical guidance. Preserve visible-player screenshot analysis, keep screenshot probabilities experimental, and do not claim calibrated WPA. Test desktop/mobile and persistence before publishing any authorized changes.

## Recommended next release — Match Decision Studio

Bring the existing tools into one clear workflow. This is a proposed release theme, not a new validated prediction model or a claim of market exclusivity.

### 1. Compare three choices

**Pass · Shoot · Keep possession**

Show each action's benefits, risks and illustrative win impact together. Implement the missing keep-possession scenario first using Priority 1 above. Make shared match context, comparison horizon and action-specific assumptions easy to inspect.

### 2. Add score-aware guidance

Offer three explicit, user-controlled tactical intentions:

- **Protect the lead**
- **Find a winning goal**
- **Chase an equaliser**

Explain the tradeoffs using the entered score and remaining time. Label the guidance experimental and allow overrides. These intentions must not bypass feasibility checks or be described as statistically proven optimal strategies. Follow Priority 2 above.

### 3. Make decision flips visual

Show the defender's original position, hypothetical position and movement arrow, then highlight the changed recommended route. Provide **Preview**, **Apply**, and **Undo**. Preview must not change the board; applying must be deliberate and reversible. Follow Priority 3 above.

### 4. Add presentation mode

Provide a focused demo sequence:

**Situation → Suggested action → Explanation → Move defender → Changed decision**

- [ ] Use actual current engine results and clearly marked hypothetical changes.
- [ ] Keep score, time, chosen objective and experimental status visible.
- [ ] Offer next/back controls and a reset so the demonstration is repeatable.
- [ ] Show why the suggestion changed; handle no-change and no-viable-action cases honestly.
- [ ] Preserve the user's working board when entering/exiting a demo, or make any replacement explicit and reversible.
- [ ] Support keyboard navigation and readable phone layouts.
- [ ] Keep labels distinguishing heuristic recommendations, user-assumed scenarios and observed outcomes.

### Recommended build order

1. Three-action comparison.
2. Score-aware guidance.
3. Visual decision flips.
4. Presentation mode.

Keep trained win-impact predictions on the separate research track described above. The release should provide useful, explainable decisions without overstating prediction accuracy. Screenshot probabilities remain experimental.

### Expanded next-session request

> Read docs/NEXT-UPGRADE.md and build the Match Decision Studio release in the recommended order: pass/shoot/keep-possession comparison, opt-in score-aware guidance, visual decision-flip preview with Apply/Undo, then presentation mode. Reuse existing engines and preserve current workflows. Keep screenshot probabilities experimental and do not claim calibrated WPA. Test desktop/mobile, persistence, invalidation and reversible demo controls before publishing authorized changes.

## Progress update — 22 October 2026

The keep-possession action is now implemented as an illustrative no-own-shot scenario, with retention/turnover branches, a separate retention input, save/load/export support and compatibility with older saved scenarios. See MATCH-OUTLOOK.md. Priority 1 is partially fulfilled: richer branches and expected draw/loss output remain future work; the current comparison reports expected win impact. Next product priority is opt-in score-aware guidance. Calibrated WPA remains unfinished.


## Progress update — 26 October 2026

Opt-in score-aware guidance is implemented: automatic score context, manual intentions, mismatch explanation, remaining-time context, full-time handling and persistence. It leaves probability and ranking engines unchanged. Verified 66 app tests, deployment dry run and phone-width layout. Next product priority: visual decision-flip Preview / Apply / Undo. Richer draw/loss comparison and presentation mode remain outstanding; calibrated WPA and screenshot probabilities remain experimental.

## Visual decision-flip update — 26 October 2026

Preview / Apply / Undo is implemented and checked at phone width. The preview displays both routes and the hypothetical defender displacement, without changing the live board until Apply. 68 app tests and Cloudflare dry run passed. Next: complete win/draw/loss action comparison, then presentation mode. Prediction validation remains separate.

## Full outcome comparison — 26 October 2026

Pass, shoot and keep-possession calculations now show win/draw/loss and percentage-point changes against baseline, with captured per-action assumptions in responsive cards. 70 tests, Cloudflare dry run and phone-width checks passed. Richer event branches remain research work. Next product priority: presentation mode for a guided, reversible demonstration.

## Workspace organization — 26 October 2026

Added direct screenshot and match-outcome entry points, contextual next-step guides for all six workspaces, and a phone workspace selector. Navigation preserves current board state. Verified 71 app tests, Cloudflare dry run and six phone-width views without page overflow. New guidance is currently English, consistent with the existing partial localization; fuller translation remains future work.

## Guided demo — 26 October 2026

Start guided demo in the workspace toolbar opens a five-step walkthrough on a frozen copy of the working board: situation, leading pass, hypothetical defender move, changed recommendation, illustrative match impact. Next/Back/Restart/Exit and Escape preserve the editable board. No viable route, no flip, replay lock and insufficient time are handled explicitly. Score/time/rates come from Match outlook; action probabilities are labeled demo assumptions. 73 tests and Cloudflare dry run passed. Phone visual verification remains pending because browser use was disabled.
