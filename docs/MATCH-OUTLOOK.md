# Match outlook: experimental scenarios

## Audit and scope

Before this change, RIPPLE had a physical passing model with heuristic rankings and synthetic replay shot events. It had no shooting-score or trained xG calculation. This MVP adds an isolated sixth workspace; it does not deploy the research CatBoost model or change the passing rankings. Screenshot measurements remain separate and do not populate this full-board experiment.

## Calculations

For each side, lambda = assumed goals per 90 × remaining minutes / 90. Independent Poisson counts use p(0)=exp(-lambda), p(k)=p(k-1)lambda/k. Enumerate until omitted mass <=1e-12 for each side, normalize, then sum score comparisons into win/draw/loss. UI percentages use largest-remainder rounding to total 100.0%. At regulation plus entered stoppage time the result is deterministic. No extra time or penalties, time-varying strength, possession adjustment or automatic home advantage. Goal rates already include whatever home advantage the user assumes. Formula reference: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html

Shot opportunity is a new heuristic, **not xG**: clamp to [0,100] the quantity 100 × [0.5 exp(-distance/25) + 0.3 min(1, goal-angle/(pi/3)) + 0.2 min(1, nearest-opponent-distance/8) - 0.12 blockers]. A blocker is within 1.5m of the centre-goal segment, between ball/target and goal. Opponents include the goalkeeper; goalkeeper distance is also displayed, but keeper reach/skill is not modelled. Defenders remain at their current positions when assessing a receiving location. These coefficients are design assumptions without calibration.

The three highest-ranked distinct feasible receivers and a hypothetical direct shot are shown. Direct shots are not asserted feasible. Passing score is never converted into pass success. The user explicitly chooses probabilities for completion S, shot creation C, goal conditional on shot G, and counter goal after failure T. All are assumptions; no genuine xG is displayed.

Pass branch weights: SCG (goal), S(1-C) (no shot), SC(1-G) (miss), (1-S)(1-T) (failed pass, no counter goal), (1-S)T (counter goal). Shot branch weights: G, (1-G)(1-T), (1-G)T. Sum the win probability of each post-branch score weighted by its probability; subtract pre-action baseline and report **percentage points**.

The explicit branches replace goal generation over a user-selected action/counter interval. Poisson restarts after that interval, avoiding double counting within it. Pass interval must cover preparation plus flight. No-goal branches use identical future goal rates regardless of possession. Rebounds, counters after a completed pass followed by a miss, and other events within the interval are omitted. This is illustrative impact, not statistically grounded WPA or a best-action recommendation. An interval longer than remaining time is rejected.

## Try it

Run `npm start`, open the printed URL, then choose **06 Match outlook**. Set team/score/minute/rates. The analysed team must match the board passer. Explore an action, edit probabilities, and calculate illustrative impact. Compare different action assumptions in the table. Change the score or a player on the tactics board: stale scenarios are cleared. Reset restores match defaults. Match context has a separate match-scenario save/export format; existing board-only JSON exports are unchanged. The new panel is currently English; existing app translations remain available elsewhere.

## Follow-up features

Save/load a match scenario locally or export/import a versioned JSON containing the full board, match context, selected action and current probability assumptions. Imported input is validated before mutation; results are recomputed, never trusted from a file. Existing board-only JSON remains compatible and separate. Comparative table history is not serialized; the selected scenario can be recalculated after loading.

The optional motion lab plots geometric curved paths and ideal lofted trajectories. Ground duration = sampled horizontal arc length / entered speed. Loft airtime = sqrt(8 × peak height / 9.81), with peak-height parabola and implied horizontal speed; the ground speed field does not control loft airtime. Entered receiver velocity extrapolates a constant vector. These are illustrative mechanics, not learned motion or interception assessments; they do not feed WPA or alter the passing ranker. No physical Magnus-force/aerodynamic curve model is claimed.

Research training and historical test results: `ml/OUTLOOK.md` and `ml/outlook-evaluation.json`. Both new CatBoost experiments failed their comparative deployment screen. Consequently validated xG/shot-creation/WPA remains **not completed**; the software cannot manufacture that evidence. The app continues to expose explicit assumptions.

## Verification and next steps

`npm test` covers normalization, symmetry, bounds, full time/stoppage, missing probabilities, action branches, turn-over costs, mirror geometry, no mutation, UI invalidation and existing functionality. Browser checks cover the scenario calculation and 390px mobile layout. These are software tests, not prediction validation.

Next research: train and calibrate shot creation and scoring on appropriate independent shot/possession data, jointly model turnover/possession transitions, then validate match forecasts and action scenarios on held-out matches. Do not train on the screenshot benchmark or claim that these user-entered scenarios validate the trained passing model.

## Spec completion audit (22 October 2026)

| Requirement | Status and evidence |
| --- | --- |
| Audit existing shooting calculation | Complete: none existed; isolated transparent geometry heuristic added. |
| Preserve passing, presets, dragging, screenshots and replay | Complete at software-test level; existing engine retained. |
| Match context and normalized Poisson W/D/L | Complete, experimental; normalization, boundaries and full-time tests pass. |
| Action comparison and adverse outcome branches | Complete as user-assumed scenarios, not calibrated WPA. |
| Grounded explanation and educational simulator | Complete with computed branch weights, assumptions and percentage-point changes. |
| Scenario persistence and export/import | Complete; live Cloudflare save/restore and exported JSON round trip verified. |
| Motion stretch goals | Partial: existing pass animation plus isolated curve/loft/constant-velocity illustrations. Curved/lofted defender interception prediction is not implemented. |
| Train shot scoring and creation models | Research completed; both CatBoost candidates failed the comparative promotion screen. See ../ml/OUTLOOK.md. |
| Historical outcome evaluation | Initial 64-match evaluation completed; insufficient to claim broad production calibration. |
| Calibrated pass-to-shot-to-win pipeline | Open: joint transition/counter modelling and independent screenshot outcome validation still required. |
| Mobile layout | Earlier 390px MVP check passed. Latest follow-up browser viewport override did not change actual viewport, so no new phone verification is claimed. |

Live follow-up checks: scenario calculation, curved route preview, save/load and JSON export/import all worked without observed console errors. A pending-import race was fixed and regression-tested for reset, board edits and saved-scenario loads. Final local checks: 58 app tests passed and Cloudflare deployment dry run passed. Software correctness does not establish prediction accuracy.


## Verification update: external holdout and phone UI

The `2fd3de3` import fix was confirmed live by comparing Cloudflare's outcome-ui.js with the local tested source (normalized line endings): exact match. A new 51-match Euro 2024 frozen-model evaluation is documented in `ml/OUTLOOK.md`; both candidates failed the comparative screen again. The user chose to keep screenshot probabilities experimental pending independent labels.

Phone layout was checked through a local iframe of width 390px (375px available content after its scrollbar), using the same app sources. Confirmed no page-wide horizontal overflow in Match outlook or Screenshot lab; calculation, deterministic full-time draw, save/load, loft plotting and two-visible-player practice analysis worked. The table and navigation have their own horizontal scrolling. This is responsive browser testing, not physical iOS/Android device testing. One unattributed MutationObserver error appeared in the wrapper console; the tested app interactions completed. Direct live-tab checks previously showed no console errors.

All 22 public HTML/JavaScript/CSS assets were compared against Cloudflare and matched the tested build after line-ending normalization. Four extraction audits and four screenshot-runner software tests passed. No application source changed in this verification commit; the previously passed 58-test app build is unchanged.

## Transition audit follow-up

See `ml/WPA-VALIDATION.md` and `ml/transition-audit.json`: 179 matches, 120,021 eligible pass windows and 4,033 shot windows. The audit identifies omitted goal branches and sparse opponent-goal labels. It does not validate alternative-action WPA. Screenshot probabilities remain experimental at the user's explicit request.
